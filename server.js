const TIME_FOR_TEST = 45000;
const NUM_CARDS = 3;
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

// Create server
server.listen(3000, () => console.log('server is running on port', server.address().port));

// Server variables
var seed = -1;
var deadline = -1;
var cards = null;
var saw_all_cards = false;
var already_answered = false;

// Server logic
io.on('connection', function(socket) {

    console.log('socket conectado ' + socket.request.connection.remoteAddress);

    socket.on('reset', (data) => {
        seed = -1;
        deadline = -1;
        cards = null;
        saw_all_cards = false;
        already_answered = false;
    });

    socket.on('request_card', (data) => {
        if (cards === null) {
            seed = USE_FIXED_SEED ? FIXED_SEED_VALUE : Math.random();
            deadline = Date.now() + TIME_FOR_TEST;
            cards = generate_cards(seed);
            saw_all_cards = false;
            already_answered = false;
            socket.emit('init', {deadline: deadline});
        }
        var card = cards.pop();
        if (cards.length === 0) {
            saw_all_cards = true;
        }
        socket.emit('card', {card: card});
    })

    socket.on('answer', function(data) {
        var got_count = check_answer(data.count);
        var within_deadline = Date.now() <= deadline;
        if (already_answered) {
            socket.emit('fail_answered');
        } else if (!got_count) {
            socket.emit('fail_wrong', {correct: get_correct_count()});
        } else if (got_count && !saw_all_cards) {
            socket.emit('fail_see_all_cards');
        } else if (got_count && !within_deadline) {
            socket.emit('fail_time');
        } else {
            socket.emit('pass', {code: data.count + String(seed).substring(1)});
        }
        already_answered = true; //enforce no second guessing!
        cards = null;
        seed = -1;
    })
});

/**** Actual counting logic ****/

var SeededShuffle = require('seededshuffle');

function check_answer(count) {
    return String(count) === String(get_correct_count());
}

function get_correct_count() {
    return count_cards(generate_cards(seed));
}

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
