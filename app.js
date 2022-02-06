const SESSION_ID = window.location.pathname;

MESSAGE_TYPE = {
  STATE_REQUEST: "state_request",
  STATE: "state",
  VOTE: "vote",
  REGISTER: "register",
  REVEAL_CARDS: "reveal_cards",
  RENEW_GAME: "renew_game",
};

// let socket = new WebSocket(`ws://${window.location.host}`);

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

const App = {
  data() {
    return {
      counter: 0,
      playerName: "",
      variants: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, "?"],
      vote: null,
      isCardsOpen: false,
      cards: [
        // {
        //   playerName: "Dmitry Golubkov",
        //   bid: 5,
        // },
        // {
        //   playerName: "Ivan Petrov",
        //   bid: null,
        // },
        // {
        //   playerName: "Sergey Ivanov",
        //   bid: 15,
        // },
      ],
    };
  },
  mounted() {
    this.playerName = localStorage.getItem("playerName");
    this.playerId = localStorage.getItem("playerId");
    if (!this.playerName || !this.playerId) {
      this.playerName = prompt("Enter your name", "Harry potter");
      this.playerId = uuidv4();
      localStorage.setItem("playerName", this.playerName);
      localStorage.setItem("playerId", this.playerId);
    }

    this.cards = [
      {
        playerName: this.playerName,
        playerId: this.playerId,
        bid: null,
      },
    ];

    console.log("playerName", this.playerName);

    this.socket = new WebSocket(`ws://${window.location.hostname}:8081`);

    this.socket.addEventListener("error", (event) => {
      console.log("error", event);
    });
    this.socket.addEventListener("open", (event) => {
      console.log("open", event);

      let msg = JSON.stringify({
        sessionId: SESSION_ID,
        type: MESSAGE_TYPE.REGISTER,
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
      //   if (message.sessionId !== SESSION_ID) {
      //     return;
      //   }

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

      if (
        [MESSAGE_TYPE.VOTE, MESSAGE_TYPE.STATE, MESSAGE_TYPE.REGISTER].includes(
          message.type
        )
      ) {
        let found = false;
        this.cards.forEach((card) => {
          if (card.playerId === message.playerId) {
            card.playerName = message.playerName;
            card.bid = message.vote;
            found = true;
          }
        });
        if (!found) {
          this.cards.push({
            playerName: message.playerName,
            playerId: message.playerId,
            bid: message.vote,
          });
        }

        console.log("this.cards", this.cards);
      }

      if (message.type === MESSAGE_TYPE.REVEAL_CARDS) {
        this.isCardsOpen = true;
      }

      if (message.type === MESSAGE_TYPE.RENEW_GAME) {
        this.isCardsOpen = false;
        this.vote = null;
        this.socket.send(
          JSON.stringify({
            sessionId: SESSION_ID,
            type: "vote",
            playerName: this.playerName,
            playerId: this.playerId,
            vote: this.vote,
          })
        );
      }
    });
  },
  created() {},
  methods: {
    onVote(vote) {
      console.log({ vote });
      this.vote = vote;
      this.socket.send(
        JSON.stringify({
          sessionId: SESSION_ID,
          type: "vote",
          playerName: this.playerName,
          playerId: this.playerId,
          vote: vote,
        })
      );
    },

    onRename() {
      this.playerName = prompt("Enter your name", this.playerName);
      localStorage.setItem("playerName", this.playerName);

      this.socket.send(
        JSON.stringify({
          sessionId: SESSION_ID,
          type: "vote",
          playerName: this.playerName,
          playerId: this.playerId,
          vote: this.vote,
        })
      );
    },

    onRevealCards() {
      this.isCardsOpen = true;
      this.socket.send(
        JSON.stringify({
          sessionId: SESSION_ID,
          type: MESSAGE_TYPE.REVEAL_CARDS,
        })
      );
    },

    onStartNewVoting() {
      this.isCardsOpen = false;
      this.socket.send(
        JSON.stringify({
          sessionId: SESSION_ID,
          type: MESSAGE_TYPE.RENEW_GAME,
        })
      );
    },

    onMessage(message) {},

    averageScore() {
      let score = 0;
      let count = 0;
      for (let idx in this.cards) {
        if (typeof this.cards[idx].bid === "number") {
          score += this.cards[idx].bid;
          count++;
        }
      }

      return count ? score / count : 0;
    },
  },
};

Vue.createApp(App).mount("#app");
