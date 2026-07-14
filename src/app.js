(async () => {
  // How many seconds wait before open cards on REVEAL message.
  const OPEN_DELAY = 3;

  // Text estimates used in the "time" voting mode (ordered from the
  // most optimistic to the most pessimistic one).
  const TIME_VARIANTS = [
    "Полдня",
    "День-два",
    "До недели",
    "До двух недель",
    "Слишком долго",
  ];

  // If URL doesn't contain a session id - generate a new one then redirect.
  const sessionId = window.location.pathname;
  if (sessionId === "/" || sessionId === "") {
    let sessionId = uuidv4();
    window.location.href = `${window.location.origin}/${sessionId}`;
  }

  MESSAGE_TYPE = {
    STATE_REQUEST: "state_request",
    STATE: "state",
    REVEAL_CARDS: "reveal_cards",
    RENEW_GAME: "renew_game",
    DISCONNECT: "disconnect",
    SET_MODE: "set_mode",
    PING: "ping",
  };

  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }

  /**
   * Generate random variants for the cards.
   *
   * @returns List of variants.
   */
  function randomVariants() {
    let variants = [];
    const ranges = [1, 2, 4, 7, 12, 22, 39, 72, 131, 240];
    const zip = (rows) => rows[0].map((_, c) => rows.map((row) => row[c]));
    const randomInt = (lowerBound, upperBound) =>
      Math.ceil(Math.random() * (upperBound - lowerBound) + lowerBound);
    bounds = zip([ranges.slice(1), ranges]);
    let lb, ub;
    for (let bound of bounds) {
      [ub, lb] = bound;
      variants.push(randomInt(ub, lb));
    }

    return variants;
  }

  const App = {
    data() {
      return {
        cards: [],
        counter: 0,
        isCardsOpen: false,
        openDelayCounter: 0,
        playerId: "",
        playerName: "",
        variants: [...randomVariants(), "?"],
        vote: null,
        mode: "numbers",
        result: { label: "Average", value: 0 },
        // Editing the card scale is hidden for now. Flip to `true` to bring
        // back the "edit values" button in the numbers mode.
        allowEditVariants: false,
        connectionStatus: "disconnected",
        connectionStatusText: "Disconnected",
        showEditModal: false,
        editValues: [],
        showRenameModal: false,
        newPlayerName: "",
      };
    },
    mounted() {
      let playerName = localStorage.getItem("playerName");
      let playerId = localStorage.getItem("playerId");
      let savedVariants = localStorage.getItem("cardVariants");
      let savedMode = localStorage.getItem("mode");

      // Restore the previously selected voting mode.
      if (savedMode === "time" || savedMode === "numbers") {
        this.mode = savedMode;
      }

      // Set the card variants for the current mode. In the "time" mode the
      // variants are fixed; in the "numbers" mode the saved custom variants
      // are used if they exist.
      if (this.mode === "time") {
        this.variants = [...TIME_VARIANTS, "?"];
      } else if (savedVariants) {
        this.variants = JSON.parse(savedVariants);
      }

      // Generating a new unique `playerId` if not defined.
      if (!playerId) {
        playerId = uuidv4();
        localStorage.setItem("playerId", playerId);
      }
      this.playerId = playerId;

      // Asking the user to enter the player's name if it is not defined.
      if (!playerName) {
        playerName = "Harry Potter";
        this.newPlayerName = playerName;
        this.showRenameModal = true;
      }
      this.playerName = playerName;

      // Setting the default card value with no vote.
      this.cards = [
        {
          playerName: this.playerName,
          playerId: this.playerId,
          vote: null,
        },
      ];

      let connect = () => {
        let schema = window.location.protocol === "https:" ? "wss" : "ws";
        this.socket = new WebSocket(
          `${schema}://${window.location.hostname}:${window.location.port}${window.location.pathname}`
        );

        this.socket.addEventListener("error", (event) => {
          console.error("WebSocket error", event);
          this.connectionStatus = "disconnected";
          this.connectionStatusText = "Connection Error";
        });

        // Trying to re-reconnect each time on disconnect.
        this.socket.addEventListener("close", (event) => {
          if (this.keepAliveEmitter) {
            clearInterval(this.keepAliveEmitter);

            // Trying to reconnect.
            setTimeout(() => {
              this.connectionStatus = "connecting";
              this.connectionStatusText = "Reconnecting...";
              connect();
            }, 1000);
          }

          this.connectionStatus = "disconnected";
          this.connectionStatusText = "Disconnected";
          console.error("WebSocket connection is closed.", event);
        });

        this.socket.addEventListener("open", (event) => {
          this.connectionStatus = "connected";
          this.connectionStatusText = "Connected";
          
          // Init backend auto-ping, to keep connectoion alive.
          this.keepAliveEmitter = setInterval(() => {
            let msg = JSON.stringify({
              type: MESSAGE_TYPE.PING,
              playerId: this.playerId,
            });
            this.socket.send(msg);
          }, 5000);

          msg = JSON.stringify({
            playerId: this.playerId,
            type: MESSAGE_TYPE.STATE_REQUEST,
          });
          this.socket.send(msg);
        });

        this.socket.addEventListener("message", (messageEvent) => {
          let message = JSON.parse(messageEvent.data);

          // If another player requested our STATE - send it.
          if (message.type === MESSAGE_TYPE.STATE_REQUEST) {
            this.sendState();
          }

          // If the player is disconnected - remove his cart from the table.
          if (message.type === MESSAGE_TYPE.DISCONNECT) {
            for (let cardIdx in this.cards) {
              if (this.cards[cardIdx].playerId == message.playerId) {
                this.cards.splice(cardIdx, 1);
              }
            }
          }

          // Adopt the voting mode broadcast by another player, so a player
          // who just joined picks up the currently selected mode. Ignored
          // while a reveal is in progress (counting down or cards open) so a
          // remote switch can't wipe votes mid-round.
          if (message.type === MESSAGE_TYPE.SET_MODE || message.type === MESSAGE_TYPE.STATE) {
            if (
              message.playerId !== this.playerId &&
              !this.isCardsOpen &&
              !this.openDelayCounter &&
              (message.mode === "time" || message.mode === "numbers") &&
              message.mode !== this.mode
            ) {
              this.applyMode(message.mode);
            }
          }

          // If a new STATE of any player is received, simply update the cards
          // on the table.
          if (message.type === MESSAGE_TYPE.STATE) {
            let found = false;
            this.cards.forEach((card) => {
              if (card.playerId === message.playerId) {
                card.playerName = message.playerName;
                card.vote = message.vote;
                found = true;
              }
            });
            if (!found) {
              this.cards.push({
                playerName: message.playerName,
                playerId: message.playerId,
                vote: message.vote,
              });
            }
          }

          // If a REVEAL message is received, open cards after the OPEN_DELAY
          // interval.
          if (message.type === MESSAGE_TYPE.REVEAL_CARDS) {
            // If we get REVEAL_CARDS, start the open interval from start.
            if (this.openDelayInterval) {
              clearInterval(this.openDelayInterval);
            }

            this.openDelayCounter = OPEN_DELAY;
            this.openDelayInterval = setInterval(() => {
              this.openDelayCounter--;

              if (this.openDelayCounter <= 0) {
                this.isCardsOpen = true;
                this.result = this.calcResult();

                // Update the voting results and calculate average.
                // `setTimeout` is required to wait for `v-if` is ready.
                setTimeout(() => {
                  this.clipboard = new ClipboardJS(".app__clipboard-btn", {
                    text: (trigger) => {
                      let content = "";
                      for (let card of this.cards) {
                        let playerName = card.playerName.toLowerCase();
                        playerName = playerName.replace(" ", ".");
                        let vote = card.vote ?? "?";
                        content += `* @${playerName}: ${vote}\n`;
                      }

                      content += `\n`;
                      content += `${this.result.label}: ${this.result.value}`;
                      return content;
                    },
                  });
                }, 0);

                clearInterval(this.openDelayInterval);
              }
            }, 1000);
          }

          // If a RENEW_GAME message is received, close all cards, reset our
          // vote, re-new card variants and send our new STATE to the other
          // players.
          if (message.type === MESSAGE_TYPE.RENEW_GAME) {
            this.isCardsOpen = false;
            this.vote = null;
            this.cards.splice(1, this.cards.length);
            this.cards[0].vote = null;
            if (this.mode === "time") {
              this.variants = [...TIME_VARIANTS, "?"];
            } else {
              this.variants = [...randomVariants(), "?"];
            }

            this.sendState();
          }
        });
      };

      connect();
    },

    methods: {
      // Broadcast our current state (name, vote and the selected voting mode)
      // to the other players.
      sendState() {
        this.socket.send(
          JSON.stringify({
            type: MESSAGE_TYPE.STATE,
            playerName: this.playerName,
            playerId: this.playerId,
            vote: this.vote,
            mode: this.mode,
          })
        );
      },

      onVote(vote) {
        this.vote = vote;
        this.sendState();
      },

      onRename() {
        this.newPlayerName = this.playerName;
        this.showRenameModal = true;
        document.body.classList.add('modal-open');
        // Focus the input after the modal is shown
        this.$nextTick(() => {
          if (this.$refs.renameInput) {
            this.$refs.renameInput.focus();
          }
        });
      },

      onCloseRenameModal() {
        this.showRenameModal = false;
        this.newPlayerName = "";
        document.body.classList.remove('modal-open');
      },

      onSaveRename() {
        const trimmedName = this.newPlayerName.trim();
        if (trimmedName) {
          this.playerName = trimmedName;
          localStorage.setItem("playerName", this.playerName);

          this.sendState();
        }
        this.showRenameModal = false;
        document.body.classList.remove('modal-open');
      },

      onRevealCards() {
        this.socket.send(
          JSON.stringify({
            playerId: this.playerId,
            type: MESSAGE_TYPE.REVEAL_CARDS,
          })
        );
      },

      onStartNewVoting() {
        this.socket.send(
          JSON.stringify({
            playerId: this.playerId,
            type: MESSAGE_TYPE.RENEW_GAME,
          })
        );
      },

      calcAverageScore() {
        let score = 0;
        let count = 0;
        for (let idx in this.cards) {
          if (typeof this.cards[idx].vote === "number") {
            score += this.cards[idx].vote;
            count++;
          }
        }

        return Math.round(count ? score / count : 0, 1);
      },

      // Most frequent time estimate. Ties are resolved towards the more
      // pessimistic (later) option in the `TIME_VARIANTS` order.
      calcConsensus() {
        let counts = {};
        for (let card of this.cards) {
          let vote = card.vote;
          if (vote === null || vote === "?") continue;
          counts[vote] = (counts[vote] || 0) + 1;
        }

        let best = "—";
        let bestCount = 0;
        for (let variant of TIME_VARIANTS) {
          let count = counts[variant] || 0;
          if (count > 0 && count >= bestCount) {
            best = variant;
            bestCount = count;
          }
        }

        return best;
      },

      // Build the voting result depending on the current mode.
      calcResult() {
        if (this.mode === "time") {
          return { label: "Consensus", value: this.calcConsensus() };
        }
        return { label: "Average", value: this.calcAverageScore() };
      },

      // A vote is rendered as a wide "text" card/button when it is a
      // multi-character string (e.g. a time estimate) rather than a number
      // or the "?" placeholder.
      isTextVote(vote) {
        return typeof vote === "string" && vote !== "?" && vote.length > 1;
      },

      // Toggle the voting mode locally and notify the other players so the
      // switch is synchronized across everyone in the session.
      onSetMode(newMode) {
        if (this.mode === newMode) return;
        // Mode is a setting for the next round, not the current one.
        if (this.isCardsOpen || this.openDelayCounter) return;

        this.applyMode(newMode);
        this.socket.send(
          JSON.stringify({
            type: MESSAGE_TYPE.SET_MODE,
            playerId: this.playerId,
            mode: newMode,
          })
        );
      },

      // Apply a voting mode locally: switch the card variants and drop the
      // current vote if it no longer fits the new mode. Used both for our own
      // toggle and for a mode change received from another player.
      applyMode(newMode) {
        this.mode = newMode;
        localStorage.setItem("mode", newMode);

        if (newMode === "time") {
          this.variants = [...TIME_VARIANTS, "?"];
        } else {
          let savedVariants = localStorage.getItem("cardVariants");
          this.variants = savedVariants
            ? JSON.parse(savedVariants)
            : [...randomVariants(), "?"];
        }

        // Reset the vote if it's no longer available in the new mode and
        // let the other players know about it.
        if (this.vote !== null && !this.variants.includes(this.vote)) {
          this.vote = null;
          this.cards[0].vote = null;
          this.sendState();
        }
      },

      onEditValues() {
        // Initialize with current values, excluding the "?" value
        this.editValues = this.variants.filter(v => v !== "?").map(v => String(v));
        this.showEditModal = true;
        document.body.classList.add('modal-open');
      },

      onCloseModal() {
        this.showEditModal = false;
        this.editValues = []; // Clear the values when closing
        document.body.classList.remove('modal-open');
      },

      onAddValue() {
        this.editValues.push(""); // Add an empty string for the new value
      },

      onRemoveValue(index) {
        if (this.editValues.length > 1) {
          this.editValues.splice(index, 1);
        }
      },

      onSaveValues() {
        // Filter out empty values and convert to numbers where possible
        const newValues = this.editValues
          .map(v => v.trim())
          .filter(v => v !== "")
          .map(v => {
            const num = Number(v);
            return isNaN(num) ? v : num;
          });

        if (newValues.length > 0) {
          this.variants = [...newValues, "?"];
          localStorage.setItem("cardVariants", JSON.stringify(this.variants));
          
          // Reset vote if the current vote is not in the new variants
          if (this.vote !== null && !this.variants.includes(this.vote)) {
            this.vote = null;
            this.sendState();
          }
        }
        
        this.showEditModal = false;
        this.editValues = []; // Clear the values after saving
        document.body.classList.remove('modal-open');
      },
    },
  };

  // Register service worker to use the app as PWA.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("/service-worker.js", { scope: window.location.href })
        .then((res) => console.log("service worker registered"))
        .catch((err) => console.log("service worker not registered", err));
    });
  }

  // Required for the right Vue template initialization.
  setTimeout(() => {
    Vue.createApp(App).mount("#app");
  });
})();
