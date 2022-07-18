(async () => {
  // How many seconds wait before open cards on REVEAL message.
  const OPEN_DELAY = 3;

  // If URL doesn't contain a session id - generate a new one then redirect.
  const SESSION_ID = window.location.pathname;
  if (SESSION_ID === "/" || SESSION_ID === "") {
    let newSessionId = uuidv4();
    window.location.href = `${window.location.origin}/${newSessionId}`;
  }

  MESSAGE_TYPE = {
    STATE_REQUEST: "state_request",
    STATE: "state",
    REVEAL_CARDS: "reveal_cards",
    RENEW_GAME: "renew_game",
    DISCONNECT: "disconnect",
    PING: "ping"
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
        averageScore: 0,
      };
    },
    mounted() {
      let playerName = localStorage.getItem("playerName");
      let playerId = localStorage.getItem("playerId");

      // Generating a new unique `playerId` if not defined.
      if (!playerId) {
        playerId = uuidv4();
        localStorage.setItem("playerId", playerId);
      }
      this.playerId = playerId;

      // Asking the user to enter the player's name if it is not defined.
      if (!playerName) {
        playerName = "Harry Potter";
        let newName = prompt("Enter your name", playerName);
        if (newName) {
          playerName = newName;
        }
        localStorage.setItem("playerName", playerName);
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
          `${schema}://${window.location.hostname}:${window.location.port}`
        );

        this.socket.addEventListener("error", (event) => {
          console.error("WebSocket error", event);
        });

        // Trying to re-reconnect each time on disconnect.
        this.socket.addEventListener("close", (event) => {
          if (this.keepAliveEmitter) {
            clearInterval(this.keepAliveEmitter);

            // Trying to reconnect.
            setTimeout(() => {
              connect();
            }, 1000);
          }

          console.error("WebSocket connection is closed.", event);
        });

        this.socket.addEventListener("open", (event) => {
          console.log("WebSocket connection is open.", event);

          // Init backend auto-ping, to keep connectoion alive.
          this.keepAliveEmitter = setInterval(() => {
            let msg = JSON.stringify({
              type: MESSAGE_TYPE.PING,
              playerId: this.playerId,
            });
            console.log("<-- send message", msg);
            this.socket.send(msg);
          }, 5000);


          let msg = JSON.stringify({
            sessionId: SESSION_ID,
            type: MESSAGE_TYPE.STATE,
            playerName: this.playerName,
            playerId: this.playerId,
            vote: this.vote,
          });
          this.socket.send(msg);
          console.log("<-- send message", msg);

          msg = JSON.stringify({
            sessionId: SESSION_ID,
            type: MESSAGE_TYPE.STATE_REQUEST,
          });
          this.socket.send(msg);
          console.log(msg);
        });

        this.socket.addEventListener("message", (messageEvent) => {
          console.log("--> get message", messageEvent.data);
          let message = JSON.parse(messageEvent.data);
          if (message.type === MESSAGE_TYPE.STATE_REQUEST) {
            this.socket.send(
              JSON.stringify({
                sessionId: SESSION_ID,
                type: MESSAGE_TYPE.STATE,
                playerId: this.playerId,
                playerName: this.playerName,
                vote: this.vote,
              })
            );
          }

          // If the player was disconnected just remove his cart from the table.
          if (message.type === MESSAGE_TYPE.DISCONNECT) {
            for (let cardIdx in this.cards) {
              if (this.cards[cardIdx].playerId == message.playerId) {
                this.cards.splice(cardIdx, 1);
              }
            }
          }

          // If we got a new state of the some player, just update cards on the table.
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

          // If REVEAL message was gotten - open cards after
          // OPEN_DELAY interval.
          if (message.type === MESSAGE_TYPE.REVEAL_CARDS) {
            // If we got REVEAL_CARDS twice.
            if (this.openDelayInterval) {
              clearInterval(this.openDelayInterval);
            }
            
            this.openDelayCounter = OPEN_DELAY;
            this.openDelayInterval = setInterval(() => {
              this.openDelayCounter--;

              if (this.openDelayCounter <= 0) {
                this.isCardsOpen = true;
                this.averageScore = this.calcAverageScore();

                // Update the voting results and calculate average.
                // `setTimeout` is required to wait when `v-if` is ready.
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
                      content += `Average: ${this.averageScore}`;
                      return content;
                    },
                  });
                }, 0);

                clearInterval(this.openDelayInterval);
              }
            }, 1000);
          }

          if (message.type === MESSAGE_TYPE.RENEW_GAME) {
            this.isCardsOpen = false;
            this.vote = null;
            this.cards.splice(1, this.cards.length);
            this.cards[0].vote = null;
            this.variants = [...randomVariants(), "?"];

            this.socket.send(
              JSON.stringify({
                sessionId: SESSION_ID,
                type: MESSAGE_TYPE.STATE,
                playerName: this.playerName,
                playerId: this.playerId,
                vote: this.vote,
              })
            );
          }
        });
      };

      connect();
    },

    methods: {
      onVote(vote) {
        this.vote = vote;
        this.socket.send(
          JSON.stringify({
            sessionId: SESSION_ID,
            type: MESSAGE_TYPE.STATE,
            playerName: this.playerName,
            playerId: this.playerId,
            vote: this.vote,
          })
        );
      },

      onRename() {
        let newName = prompt("Enter your name", this.playerName);
        if (newName) {
          this.playerName = newName;
        }

        localStorage.setItem("playerName", this.playerName);

        this.socket.send(
          JSON.stringify({
            sessionId: SESSION_ID,
            type: MESSAGE_TYPE.STATE,
            playerName: this.playerName,
            playerId: this.playerId,
            vote: this.vote,
          })
        );
      },

      onRevealCards() {
        this.socket.send(
          JSON.stringify({
            sessionId: SESSION_ID,
            type: MESSAGE_TYPE.REVEAL_CARDS,
          })
        );
      },

      onStartNewVoting() {
        this.socket.send(
          JSON.stringify({
            sessionId: SESSION_ID,
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
    },
  };

  // Required for the right Vue template initialization.
  setTimeout(() => {
    Vue.createApp(App).mount("#app");
  });
})();
