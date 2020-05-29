'use strict';

/**Class Game handles initializing the board based on a given number of categories and clues per category. 
 * Currently hardcoded to 6 and 5 respectively, but can be changed.
 * Requests jeopardy data from jservice.io
 * Add eventlistener to the start button  */
class Game {
	constructor(numofCategories, numOfCluesPerCat) {
		this.numofCategories = numofCategories;
		this.numOfCluesPerCat = numOfCluesPerCat;
	}
	//Adds event listener to the start button which calls initBoard, and updates text when game has started
	addStartListener() {
		$('#start-btn').on('click', () => {
			this.initBoard(this);
		});
	}
	// Creates game board after data requests are resolved and appends it to board-container. Then calls board class methods
	async initBoard(game) {
		this.showLoadingView();
		const board = new Board(game, await this.createCategories(await this.getCategoryIds()));
		this.hideLoadingView();
		board.createHtmlBoard();
		board.handleClick();
	}

	// Requests specific category data from jservice.io based on a given category id
	async getCategory(catId) {
		const url = 'https://jservice.io/api/category';
		const res = await axios.get(url, { params: { id: catId } });
		const catObj = { title: res.data.title, clues: [] };
		// Uses Lodash to randomly select the desired number of clues for each category
		const clueArr = _.sampleSize(res.data.clues, this.numOfCluesPerCat);
		// Pushes category clues, answers, and a status tracker into category Object
		for (let clue of clueArr) {
			catObj.clues.push({ question: clue.question, answer: clue.answer, showing: null });
		}
		return catObj;
	}

	// Requests a set of 100 categories from jservice.io and returns a random selection based on number of desired categories
	async getCategoryIds() {
		const url = 'https://jservice.io/api/categories';
		const res = await axios.get(url, { params: { count: 100 } });
		const catSubset = _.sampleSize(res.data, this.numofCategories);
		const catIdArr = [];
		for (let cat of catSubset) {
			catIdArr.push(cat.id);
		}
		return catIdArr;
	}

	// Groups all categories objects into category array
	async createCategories(catIdArr) {
		const categories = [];
		for (let catId of catIdArr) {
			categories.push(await this.getCategory(catId));
		}
		return categories;
	}

	/** Wipe the current Jeopardy board and show the loading spinner
	 */
	showLoadingView() {
		$('#board-container').html('<i class="far fa-question-circle fa-spin fa-10x"></i>');
		$('#board-container')[0].scrollIntoView({ behavior: 'smooth', block: 'end' });
	}

	/** Remove the loading spinner and update start button text. */
	hideLoadingView() {
		$('#board-container').html('');
		$('#start-btn').text('Start New Game!');
	}
}

/**
 * Class Board handles displaying the board, populating it with categories and clues, and calling for ClueTile to for specific tile details
*/
class Board {
	constructor(game, categories) {
		this.game = game;
		this.categories = categories;
	}
	// Creates a clueTile from the ClueTile class
	initClueTile() {
		const clueTile = new ClueTile(this, this.categories);
		return clueTile;
	}
	// Create HTML board with width and length determined by numOfCategories and numOfCluesPerCat given during Game creation
	createHtmlBoard() {
		const $htmlBoard = $('<table>');
		const $tHead = $('<thead>');
		const $tBody = $('<tbody>');
		const $tHeadRow = $('<tr>');

		$htmlBoard.addClass('table text-white table-bordered');
		$tHead.attr('id', 'categories');

		$htmlBoard.append($tHead);
		$htmlBoard.append($tBody);
		$tHead.append($tHeadRow);
		// Adds table headers as category titles !! abstract out
		for (let i = 0; i < this.game.numofCategories; i++) {
			const categoryHeader = this.categories[i].title;
			$tHeadRow.append($('<th class="align-middle">').text(categoryHeader));
		}
		// Creates clue td's and assings them unique id for updating them !! abstract out
		for (let i = 0; i < this.game.numOfCluesPerCat; i++) {
			const $tBodyRow = $('<tr>');
			$tBody.append($tBodyRow);
			for (let j = 0; j < this.game.numofCategories; j++) {
				const $clueTd = $('<td class="align-middle">');
				$clueTd.attr('id', `${j}-${i}`);
				$clueTd.html(`<i class="fas fa-question" id="${j}-${i}" ></i>`);
				$clueTd.addClass('hidden');
				$tBodyRow.append($clueTd);
			}
		}
		$('#board-container').append($htmlBoard);
	}

	// Adds click event listener to the board and handles when clicks occur by grabbing td id and calling displayClue on it.
	handleClick() {
		const $htmlBoard = $('.table');
		$htmlBoard.on('click', (e) => {
			this.displayClue($(e.target).attr('id'));
		});
	}

	// Called when click occurs on board to update the board text and call ClueTile methods to update clue
	displayClue(clueId) {
		const clueTile = this.initClueTile(this, this.categories);
		const clueStatus = clueTile.checkStatus(clueId);
		$(`#${clueId}`).text(clueStatus);
	}
}

/** Class ClueTile which handles the clue status and returns what needs to be displayed when queried by Board. Also handles style for clue tile 
 */
class ClueTile {
	constructor(board, categories) {
		this.board = board;
		this.categories = categories;
	}
	// Checks the clue status of a specific clue, and calls for the status/ style to be updated. Returns what needs to be displayed.
	checkStatus(clueId) {
		const clueTile = this.categories[clueId[0]].clues[clueId[2]];
		const clueShowing = clueTile.showing;
		if (clueShowing === null) {
			this.updateStatus(clueTile);
			this.updateStyle(clueId, 'question');
			return clueTile.question;
		}
		else if (clueShowing === 'question') {
			this.updateStatus(clueTile);
			this.updateStyle(clueId, 'answer');
			return clueTile.answer;
		}
		else if (clueShowing === 'answer') {
		}
	}

	// Updates the clue status based on previous status and a click event
	updateStatus(clueTile) {
		if (clueTile.showing === null) {
			clueTile.showing = 'question';
		}
		else if (clueTile.showing === 'question') {
			clueTile.showing = 'answer';
		}
	}

	// Update style of table for tile based on state
	updateStyle(clueId, state) {
		const $clueTile = $(`#${clueId}`);
		if (state === 'question') {
			$clueTile.addClass('question');
			$clueTile.removeClass('hidden');
		}
		if (state === 'answer') {
			$clueTile.addClass('answer');
			$clueTile.removeClass('question');
		}
	}
}
let game = new Game(6, 5);
game.addStartListener();
