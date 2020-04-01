var REFRESH_TIMER_INTERVAL = 250;

var PASS_TEXT = 'You got the count correct!<br>Here is your magic number:<br>';
var FAIL_WRONG_TEXT = 'Sorry, the correct count was: ';
var FAIL_ANSWERED_TEXT = 'You already submitted an answer for this deck.<br>Click the cards to begin a new deck.';
var FAIL_SEE_ALL_CARDS_TEXT = 'You got the count right without looking at all the cards?<br>Nice guessing, but try again.';
var FAIL_TIME_TEXT = 'You got the count right, but you need to be faster.<br>Be sure to submit your answer before the timer runs out.';

var socket = io();
var state = {};
var cache = {};

socket.on('cards', (data) => {
	state.cards = data.cards;
	state.deadline = data.deadline;
	state.timer = setInterval(() => {
		var time_remaining = Math.floor((state.deadline - Date.now()) / 1000);
		if (time_remaining < 0) {
			document.getElementById('timer').innerHTML = "Time's up.";
			document.getElementById('timer').style.color = "#FF0000";
		} else {
			document.getElementById('timer').innerHTML = "Time remaining: " + time_remaining;
			document.getElementById('timer').style.color = "#000000";
		}
	}, REFRESH_TIMER_INTERVAL);
	nextCard();
})

socket.on('pass', (data) => resetClient(PASS_TEXT + data.code));
socket.on('fail_wrong', (data) => resetClient(FAIL_WRONG_TEXT + data.correct));
socket.on('fail_answered', (data) => resetClient(FAIL_ANSWERED_TEXT));
socket.on('fail_see_all_cards', (data) => resetClient(FAIL_SEE_ALL_CARDS_TEXT));
socket.on('fail_time', (data) => resetClient(FAIL_TIME_TEXT));

function resetClient(timerText) {
	
	// Clear state
	if (state.timer) {
		clearInterval(state.timer);
	}
	state = {};

	// Reset cards
	var card_container = document.getElementById('card_container');
	while (card_container.firstChild) {
		card_container.removeChild(card_container.firstChild);
	}
	card_container.appendChild(cache['cards/BLUE_BACK.svg']);

	// Reset html
	document.getElementById('count').value = '';
	document.getElementById('timer').innerHTML = timerText;

	// Have server reset my socket data
	socket.emit('reset');
};

function cardObjToSvgName(cardObj) {
	if (!cardObj) {
		return 'cards/BLUE_BACK.svg';
	}
	return 'cards/' + cardObj.rank + cardObj.suit + '.svg';
}

function nextCard() {
	if (!state.cards) {
		socket.emit('request_cards');
		return;
	}
	if (state.cards.length === 0) {
		socket.emit('saw_all_cards');
		return;
	}
	var card = state.cards.pop();
	var img = cache[cardObjToSvgName(card)].cloneNode(true);
	document.getElementById('card_container').appendChild(img);
}

function sendAnswer() {
	socket.emit('answer', {count: document.getElementById('count').value});
	document.getElementById('timer').style.color = "#000000";
}

document.onkeydown = function(e) {
	e = e || window.event;
	switch (e.keyCode) {
		case 32: //SPACEBAR
			nextCard();
			break;
		case 13: //ENTER
			sendAnswer();
			break;
		default:
			break;
	}
}

/* Initial loading, cache all SVGs in cache */

var counter = 0;
function loadSvg() {
	if (counter++ >= 52) {
		doneLoadingSvgs();
	}
}

function doneLoadingSvgs() {
	resetClient('Time remaining: ');
	document.getElementById('card_container').appendChild(cache['cards/BLUE_BACK.svg']);
}

function init() {
	document.getElementById('card_container').addEventListener('click', nextCard);
	document.getElementById('submit').addEventListener('click', sendAnswer);
	document.getElementById('count').value = '';
    var svgs = [];
	['C', 'D', 'H', 'S'].forEach(function(suit) {
		['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].forEach(function(rank) {
			svgs.push(cardObjToSvgName({suit: suit, rank: rank}));
		});
	});
	svgs.push('cards/BLUE_BACK.svg');
	for (var i = 0; i < svgs.length; i++) {
		var img = new Image();
		img.onload = loadSvg;
		img.src = svgs[i];
		cache[svgs[i]] = img;
	}
};
init();
