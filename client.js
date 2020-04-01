var REFRESH_TIMER_INTERVAL = 250;

var NOT_STARTED_TEXT = 'You must count the deck before submitting an answer.';
var PASS_TEXT = 'You got the count correct!<br>Here is your magic number:<br>';
var FAIL_WRONG_TEXT = 'Sorry, the correct count is: ';
var FAIL_ANSWERED_TEXT = 'You already submitted an answer for this deck.<br>Click New Deck to begin a new deck.';
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
			document.getElementById('info_text').innerHTML = "Time's up.";
			document.getElementById('info_text').style.color = "#FF0000";
		} else {
			document.getElementById('info_text').innerHTML = "Time remaining: " + time_remaining;
			document.getElementById('info_text').style.color = "#000000";
		}
	}, REFRESH_TIMER_INTERVAL);
	nextCard();
})

socket.on('not_started', (data) => updateInfoText(NOT_STARTED_TEXT));
socket.on('pass', (data) => updateInfoText(PASS_TEXT + data.code, false));
socket.on('fail_wrong', (data) => updateInfoText(FAIL_WRONG_TEXT + data.correct));
socket.on('fail_answered', (data) => updateInfoText(FAIL_ANSWERED_TEXT));
socket.on('fail_see_all_cards', (data) => updateInfoText(FAIL_SEE_ALL_CARDS_TEXT));
socket.on('fail_time', (data) => updateInfoText(FAIL_TIME_TEXT));

function updateInfoText(text, allow_new_deck = true) {
	document.getElementById('info_text').innerHTML = text;
	if (allow_new_deck) {
		document.getElementById('reset').style.visibility = 'visible';
	}
	state.force_no_cards = true;
}

function resetClient() {
	
	// Clear state
	clearInterval(state.timer);
	state = {};

	// Reset cards
	var card_container = document.getElementById('card_container');
	while (card_container.firstChild) {
		card_container.removeChild(card_container.firstChild);
	}
	var img = cache['cards/BLUE_BACK.svg'].cloneNode(true);
	img.classList.add('left-card');
	img.classList.remove('right-card');
	card_container.appendChild(img);

	var img = cache['cards/EMPTY.svg'].cloneNode(true);
	img.classList.add('right-card-initial');
	img.classList.remove('left-card');
	card_container.appendChild(img);

	// Reset html
	document.getElementById('count').value = '';
	document.getElementById('info_text').innerHTML = 'Time remaining: ';
	document.getElementById('reset').style.visibility = 'hidden';


	// Have server reset my socket data
	socket.emit('reset');
};

function cardObjToSvgName(cardObj) {
	return 'cards/' + cardObj.rank + cardObj.suit + '.svg';
}

function nextCard() {
	if (state.force_no_cards) {
		return;
	}
	if (!state.cards) {
		socket.emit('request_cards');
		return;
	}
	var cardName = null;
	if (state.cards.length > 0) {
		var card = state.cards.pop();
		cardName = cardObjToSvgName(card);
	} else if (!state.shown_empty) {
		socket.emit('saw_all_cards');
		cardName = 'cards/EMPTY.svg';
		state.shown_empty = true;
	} else {
		return;
	}

	//add cardName img to list of children
	var img = cache[cardName].cloneNode(true);
	var card_container = document.getElementById('card_container');
	var children = card_container.getElementsByTagName('*');
	for (var i = 0; i < children.length; i++) {
		children[i].classList.add('right-card');
	}
	card_container.appendChild(img);
}

function sendAnswer() {
	socket.emit('answer', {count: document.getElementById('count').value});
	document.getElementById('info_text').style.color = "#000000";
	document.getElementById('count').value = '';
	clearInterval(state.timer);
}

document.onkeydown = function(e) {
	if (e.repeat) {
		return;
	}
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
	if (counter++ >= 53) {
		resetClient();
	}
}

function init() {
	document.getElementById('card_container').addEventListener('click', nextCard);
	document.getElementById('reset').addEventListener('click', resetClient);
	document.getElementById('submit').addEventListener('click', sendAnswer);
	document.getElementById('count').value = '';
    var svgs = [];
	['C', 'D', 'H', 'S'].forEach(function(suit) {
		['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].forEach(function(rank) {
			svgs.push(cardObjToSvgName({suit: suit, rank: rank}));
		});
	});
	svgs.push('cards/BLUE_BACK.svg');
	svgs.push('cards/EMPTY.svg');
	for (var i = 0; i < svgs.length; i++) {
		var img = new Image();
		img.onload = loadSvg;
		img.src = svgs[i];
		img.classList.add('left-card');
		cache[svgs[i]] = img;
	}
};
init();
