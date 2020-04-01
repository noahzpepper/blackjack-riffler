const TIME_FOR_TEST = 45000;
const NUM_CARDS = 5;
const NUM_DECKS = 6;
const USE_FIXED_SEED = false;
const FIXED_SEED_VALUE = 0;

// Server node requirements and setup
var express = require('express');
var app = express();
app.use(express.static(__dirname));
app.use(express.json()); 
app.use(express.urlencoded({extended: true})); 
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

// Other node requirements
var SeededShuffle = require('seededshuffle');

// Create server
server.listen(port, () => console.log('server is running on port', server.address().port));
var state = {};

function connect_user(id) {
    var seed = USE_FIXED_SEED ? FIXED_SEED_VALUE : Math.random();
    state[id] = {
        seed: seed,
        deadline: Date.now() + TIME_FOR_TEST,
        cards: generate_cards(seed),
        saw_all_cards: false,
        already_answered: false
    };
}

function disconnect_user(id) {
    delete state.id;
}

// Server logic
io.on('connection', function(socket) {

    socket.on('disconnect', (data) => disconnect_user(socket.id));
    socket.on('reset', (data) => disconnect_user(socket.id));

    socket.on('saw_all_cards', (data) => {
        state[socket.id].saw_all_cards = true;
    });

    socket.on('request_cards', (data) => {
        if (!(socket.id in state)) {
            connect_user(socket.id);
            io.to(socket.id).emit('cards', {deadline: state[socket.id].deadline, cards: state[socket.id].cards});
        }
    });

    socket.on('answer', function(data) {

        var correct_count = String(count_cards(state[socket.id].cards));
        var guessed_count = String(data.count);

        if (state[socket.id].already_answered) {
            io.to(socket.id).emit('fail_answered');
            return;
        }
        state[socket.id].already_answered = true;
        
        if (correct_count !== guessed_count) {
            io.to(socket.id).emit('fail_wrong', {correct: correct_count});
        } else if (!state[socket.id].saw_all_cards) {
            io.to(socket.id).emit('fail_see_all_cards');
        } else if (Date.now() > state[socket.id].deadline) {
            io.to(socket.id).emit('fail_time');
        } else {
            io.to(socket.id).emit('pass', {code: data.count + String(state[socket.id].seed).substring(1)});
        }
    })
});

/**** Actual counting logic ****/

function count_cards(cards) {
    var count = 0; 
    cards.forEach(card => {
        switch (card.rank) {
            case '10':
            case 'J':
            case 'Q':
            case 'K':
            case 'A':
                count -= 1;
                break;
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                count += 1;
                break;
            default:
                break;
        }
    });
    return count;
}

function generate_cards(seed) {
    var deck = [];
    for (var i = 0; i < NUM_DECKS; i++) {
        ['C', 'D', 'H', 'S'].forEach(function(suit) {
            ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].forEach(function(rank) {
                deck.push({suit: suit, rank: rank});
            });
        });
    }
    var shuffled_deck = SeededShuffle.shuffle(deck, seed);
    return shuffled_deck.slice(0, NUM_CARDS);
}
