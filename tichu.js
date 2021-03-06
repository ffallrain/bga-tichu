/*----------------------------------------------------------------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Tichu implementation : © Bryan McGinnis <bryanrm@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * Tichu user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 */////////////////////////////////////////////////////////////////////////////////
define([
	"dojo","dojo/_base/declare",
	"ebg/core/gamegui",
	"ebg/counter",
	"ebg/stock"
],
function (dojo, declare) {
	return declare("bgagame.tichu", ebg.core.gamegui, {
		constructor: function(){
			console.log('tichu constructor');
			// Here, you can init the global variables of your user interface
			this.playerHand = null;
			this.cardwidth  = 73;
			this.cardheight = 98;
			this.players = null;
			this.cardsToPass = [];
			this.playType = -1;
		    this.maxCardValue = 0;
		},
		/* setup:
			This method must set up the game UI according to current game situation specified in parameter.
			The method is called each time the game interface is displayed to a player, ie:
				_ when the game starts
				_ when a player refresh the game page (F5)
			"gamedatas" argument contains all datas retrieved by your "getAllDatas" in tichu.game.php:128
		*/
		setup: function (gamedatas) {
		    this.players = [];
		    
			console.log( "start creating player boards" );
			for (var player_id in gamedatas.players) {
			    this.players.push(player_id);
				var player = gamedatas.players[player_id]; // Get 1st person player
				if (player.call_tichu == 1) {
					dojo.place('<label id="lblCallTichu">Tichu!</label>', 'playertichucall_'+player_id );
				}
				else if (player.call_grand_tichu == 1) {
					dojo.place('<label id="lblCallTichu">Grand Tichu!</label>', 'playertichucall_'+player_id );
				}
			}
			// Player hand
			this.playerHand = new ebg.stock();
			this.playerHand.create( this, $('myhand'), this.cardwidth, this.cardheight );
			this.playerHand.image_items_per_row = 14;
			// Player Hand selection event handler not needed (yet?)
			dojo.connect( this.playerHand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged' ); 
			// Create cards types:
			for( var color=1;color<=4;color++ ) {
				for( var value=1;value<=14;value++ ) { // Build card type id
					var card_type_id = this.getCardUniqueId( color, value );
					var card_weight  = this.getCardWeight( color, value );
					this.playerHand.addItemType( card_type_id, card_weight,
						g_gamethemeurl+'img/tichu-cards.png', card_type_id ); } }
			// Cards in player's hand
			for( var i in this.gamedatas.hand ) {
				var card = this.gamedatas.hand[i];
				var color = card.type;
				var value = card.type_arg;
			    console.log("addToStockWithID: " + this.getCardUniqueId(color, value) + " - " + card.id);
				this.playerHand.addToStockWithId( this.getCardUniqueId( color, value ), card.id ); }
			// Cards played on table, display these
			for( i in this.gamedatas.cardsontable ) { // iterate through and show all cards on table
				var card = this.gamedatas.cardsontable[i];
				var color = card.type;					// Suit of card
				var value = card.type_arg;				// # of card
				var player_id = card.location_arg;	// Player with card on table
				var cards_order = card.cards_order;	// Multiple cards in one play
				var plays_order = card.plays_order; // Multiple plays in one tricks
				// This calls line 140
				this.playCardOnTable( player_id, color, value, card.id, cards_order, plays_order );
			}
		    //if there are no card on table AND passing has not been done, show the dealing also
			if (this.gamedatas.cardsontable == null || this.gamedatas.cardsontable.length == 0) {
			    this.dealCards(gamedatas);
			}
			this.addTooltipToClass( "playertablecard", _("Card played on the table"), '' );
			// Setup game notifications to handle (see "setupNotifications" method below)
			this.setupNotifications();
			this.ensureSpecificImageLoading( ['../common/point.png'] );
		},
		
		///////////////////////////////////////////////////
		//// Game & client states
		
		// onEnteringState: this method is called each time we are entering into a new game state.
		//                  You can use this method to perform some user interface changes at this moment.
		//						  You can pass in args from states.inc.php
		onEnteringState: function( stateName, args )	{
			console.log( 'Entering state: '+stateName );
			switch( stateName ) {
			    case 'playerTurn':
			        console.log(args);
			        this.playType = parseInt(args.args.playType);
			        this.maxCardValue = parseInt(args.args.maxCardValue);
					this.addTooltip( 'myhand', _('Cards in my hand'), _('Select 1 or more card to play') );
					break;
				case 'giveCards':
					this.addTooltip( 'myhand', _('Cards in my hand'), _('Select a card') ); }
		},
		// onLeavingState: this method is called each time we are leaving a game state.
		//                 You can use this method to perform some user interface changes at this moment.
		onLeavingState: function( stateName ) {
			console.log( 'Leaving state: '+stateName );
			switch( stateName ) {
				case 'playerTurn':
					break; }
		}, 
		// onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
		//                        action status bar (ie: the HTML links in the status bar).
		onUpdateActionButtons: function( stateName, args ) {
			console.log( 'onUpdateActionButtons: '+stateName+' Args:'+args );
			if( this.isCurrentPlayerActive() ) {
			    switch (stateName) {
			        case 'declareGrandTichu':
			            this.addActionButton('passGrandTichu_button', _('Pass'), 'onPassGrandTichu');
			            this.addActionButton('callGrandTichu_button', _('Call Grand Tichu'), 'onCallGrandTichu');
                        break;
					case 'passCards':
					    this.addActionButton('passCards_button', _('Pass selected cards'), 'onPassCards');
					    this.addActionButton('resetPassCards_button', _('Reset choices'), 'onResetPassCards');
						break;
					case 'playerTurn':
						this.addActionButton('passPlay_button', _('Pass'), 'onPassPlay' );
						// if (args.canCallTichu)
							// this.addActionButton('callTichu_button', _('Tichu'), 'onCallTichu' );
						// if (args.canPlayBomb)
							// this.addActionButton('playBomb_button', _('Bomb'), 'onPlayBomb' );
						this.addActionButton('playCards_button', _('Play'), 'onPlayCards' );
				}
			}
		},        
		
		///////////////////////////////////////////////////
		//// Utility methods
		/* Here, you can define utility methods that you can use everywhere in your JS script. */
		dealCards : function (gamedatas) {
		    var card_id = 0;
		    var duration = 400;
		    var delay = 75;
		    /*for (var i = 0; i < 8; i++) {
		        for (var player_id in gamedatas.players) {
		            // player_id => direction
		            // See tichu_tichu.tpl for manifestation of placing cards
		            dojo.place( // This inserts HTML with variable parameters onto a player's hand
		                this.format_block('jstpl_cardontable', {
// x,y = tichu-cards.png (css background-position)
		                    x: 100, // width:  73px
		                    y: 100, // height: 98px
		                    z: 0, // z-index (what card is on top)
		                    player_id: player_id,
		                    card_id: card_id
		                }), 'playertablecard_' + player_id);
		            this.placeOnObject('cardontable_' + player_id + '_' + card_id, 'dealingstack');
		            // In any case: move it to its final destination
		            this.slideToObjectPos('cardontable_' + player_id + '_' + card_id, 'playertablecard_' + player_id, 0, 0, duration, delay).play();
		            delay += 125;
		        }
		    }*/
		},
		
	    //get card value based on it's unique identifier
        getCardValueByTypeID: function(cardTypeID) {
            return (cardTypeID % 14) + 1;
        },
	    //get card color based on it's unique identifier
        getCardColorByTypeID: function (cardTypeID) {
            return 1+((cardTypeID - (cardTypeID % 14)) / 14);
        },
		// Get card unique identifier based on its color and value
		getCardUniqueId: function( color, value ){
			return (color-1)*14+(value-1);
		},
		getCardWeight: function( color, value ){ // Weight or sort order
			return (color-1)+(value-1)*4; // Order by Number
		},
		getSingleCardValue: function( color, value ) {
			if (value>1) cardValue=value;				// Normal cards 2-10, J(11), Q(12), K(13), A(14)
			else if (value==1) {
				if (color===0) cardValue=0;			// Dog
				else if (color==1) cardValue=1;		// Mah Jong (1)
				// else if (color==2) cardValue=;	// Phoenix (Half point higher)
				else if (color==3) cardValue=15;		// Dragon
			}
			return cardValue;
		},
		// This is called from setup(68) (refresh page & new game) and from tichu.js:notif_playCards(295)
		playCardOnTable: function (player_id, color, value, card_id, cards_order, plays_order) {
		    console.log("playing card (" + value + ", " + color + ") with ID " + card_id + ", card order " + cards_order + ", play order " + plays_order);
			cards_order = typeof cards_order !== 'undefined' ? cards_order : 1; // If null, assign 1
			plays_order = typeof plays_order !== 'undefined' ? plays_order : 1; // If null, assign 1
			// cards_order affects Left     (Card #1-14; multiple cards in one play)
			// plays_order affects Top&Left (Play #1-14; multiple plays in one trick)

		    // The below are all for final placement
			plays_order = plays_order - 1; //because we want first one aligned with template div
			cards_order = cards_order - 1;
            var topOffset = (10 * plays_order);
		    var leftOffset = (12*cards_order)+(10*plays_order);
		    var z = (1 * cards_order) + (20 * plays_order);
		    var x = this.cardwidth*(value-1);
		    var y = this.cardheight*(color-1);
			// player_id => direction
			// See tichu_tichu.tpl for manifestation of placing cards
			dojo.place( // This inserts HTML with variable parameters onto a player's hand
				this.format_block( 'jstpl_cardontable', { // x,y = tichu-cards.png (css background-position)
					x: x,	// width:  73px
					y: y,	// height: 98px
					z: z, // z-index (what card is on top)
					player_id: player_id,
					card_id: card_id
				} ), 'playertablecard_'+player_id );
			if (player_id != this.player_id) {
			    // Some opponent played a card. Move card from player panel
				this.placeOnObject('cardontable_'+player_id+'_'+card_id,'overall_player_board_'+player_id);
			} else {
			    // You played cards. If exists in hand, move cards from hand to table, remove hand item
			    // Verify it exists in 1st person's hand
			    if ($('myhand_item_' + card_id)) {
			        this.placeOnObject('cardontable_' + player_id + '_' + card_id, 'myhand_item_' + card_id);
			        this.playerHand.removeFromStockById(card_id);
			    } else {
			        console.log('Failed to remove card from hand');
			    }
			}

            // In any case: move it to its final destination
			this.slideToObjectPos('cardontable_'+player_id+'_'+card_id,'playertablecard_'+player_id,leftOffset, topOffset).play();
		},		
		///////////////////////////////////////////////////
		//// Player's action
		/* Here, you are defining methods to handle player's action (ex: results of mouse click on 
			game objects).
			
			Most of the time, these methods:
			_ check if the action is possible at this game state.
			_ make a call to the game server
		*/
		onPlayerHandSelectionChanged: function() {
			var items = this.playerHand.getSelectedItems();//debugger;
			if( items.length > 0 ) { // Can use this to do active checking whether play is possible
			    if (this.checkAction('playCards', true)) { // Needs to select 1 or more cards
			        console.log("playCards");
			    } else if (this.checkAction('passCards')) {

			        var player_id = this.player_id;
			        var direction;
			        if (this.cardsToPass.length == 0) //left
			        {
			            direction = "W";
			        }
			        else if (this.cardsToPass.length == 1) //right
			        {
			            direction = "E";
			        }
			        else if (this.cardsToPass.length == 2) //across
			        {
			            direction = "N";
			        }
			        else {
			            //only 3 cards! bail out.
			            this.playerHand.unselectAll();
			            return;
                    }
			        
			        var topOffset = 50;//(10 * plays_order);
			        var leftOffset = 115;//(12 * cards_order) + (10 * plays_order);
			        var z = 20;//(1 * cards_order) + (20 * plays_order);
			        var value = this.getCardValueByTypeID(items[0].type);
			        var color = this.getCardColorByTypeID(items[0].type);
			        console.log("value " + value);
			        console.log("color " + color);
			        var card_id = items[0].id;
			        this.cardsToPass.push(items[0]);
			        console.log(card_id);
			        console.log(player_id);
			        var x = this.cardwidth * (value - 1);
			        var y = this.cardheight * (color - 1);

			        console.log("creating");
			        dojo.place( // This inserts HTML with variable parameters onto a player's hand
                        this.format_block('jstpl_cardontable', { // x,y = tichu-cards.png (css background-position)
                            x: x,	// width:  73px
                            y: y,	// height: 98px
                            z: z, // z-index (what card is on top)
                            player_id: player_id,
                            card_id: card_id
                        }), 'playertablecard_' + player_id);

			        if ($('myhand_item_' + card_id)) {
			            console.log("placing");
			                this.placeOnObject('cardontable_' + player_id + '_' + card_id, 'myhand_item_' + card_id);
			                this.playerHand.removeFromStockById(card_id);
			            } else {
			                console.log('Failed to remove card from hand');
			            }
			        
			        this.slideToObjectPos('cardontable_' + player_id + '_' + card_id, 'playertable_' + direction, leftOffset, topOffset).play();

			    } else {
			       this.playerHand.unselectAll();
			    }                
			}
		},
		onPlayCards: function() { // Client-side validation before send to server for server-side validation
			// Hearts didn't have this function here because 1 card click select would play card vs selecting
			// multiple cards, then pushing the Action button "Play"
			// action button "Play" or "Pass"
			if( ! this.checkAction('playCards') ) return;
			var items = this.playerHand.getSelectedItems();
			console.log('onPlayCards:items ',items);//debugger;

		    // Do some basic validation, this will also be validated on server
		    // Figure out what type of play is happening: (playType)
		    //-1 = Dog (This will actually keep playType at -1 so any type can be played, but not bomb)
			//	0 = Singles
			//	1 = Doubles
			//	2 = Triples
			//	3 = Full House
			// 4 = Consecutive Doubles
		    //	5-14 = Run of 5 or more
		    // 15 = Dog
		    // 20 = Bomb
			//
			// First check if it is a bomb play

		    var playType = this.playType;

            //get an array of the values played, this will make validation easier
			var cardValues = [];
			for (var i in items) {
			    cardValues.push(parseInt(this.getCardValueByTypeID(items[i].type)));
			}

			cardValues = cardValues.sort(function (a, b) {
			    return a - b;
			});
			
		    //AK - I think this is easier to validate by expected play type than number of cards
		    //I'll do the non-special cases first...

		    //but first, what is the expected play type?
		    //TODO add bomb handling
		    //TODO add dragon handling
            //TODO add phoenix handling
			if (playType == -1) //player has free choice. Must first figure out the type of play used.
			{
                if (items.length == 1) { //singles
                    playType = 0;
                }
                else if (items.length == 2) { //doubles
                    playType = 1;
                }
                else if (items.length == 3) { //triples
			        playType = 2;
                }
                else if (items.length == 4) { //consecutive doubles
			        playType = 4; 
                }
                else if (items.length == 5) { //full house OR run
                    if (cardValues[0] != cardValues[1]) { //a run, otherwise assume a full house
                        playType = cardValues.length;
                    } else {
                        playType = 3;
                    }
                }
                else if (items.length > 5) { //consecutive doubles OR run
                    if (cardValues[0] != cardValues[1]) {
                        playType = cardValues.length;
                    } else {
                        playType = 4;
                    }
                }
                else { //should never get this far.
			        this.showMessage(_("Unrecognised play"), 'error');
			        return;
			    }
			}
		    
            //now we have the play type. Is the chosen play valid?
		    switch (playType) {
		        case 0: //singles
		            if (items.length != 1) {
		                this.showMessage(_("Play type is singles"), 'error');
		                return;
		            }
		            else if (cardValues[0] * 10 <= this.maxCardValue) {
		                this.showMessage(_("Must play a higher card"), 'error');
		                return;
		            }
		            break;
		        case 1: //doubles
		            if (items.length != 2) {
		                this.showMessage(_("Play type is doubles"), 'error');
		                return;
		            }
		            else if (cardValues[0] != cardValues[1]) {
		                this.showMessage(_("Doubles must match"), 'error');
		                return;
		            }
		            else if (cardValues[0] * 10 <= this.maxCardValue) {
		                this.showMessage(_("Must play a higher double"), 'error');
		                return;
		            }
		            break;
		        case 2: //triples
		            if (items.length != 3) {
		                this.showMessage(_("Play type is triples"), 'error');
		                return;
		            }
		            if (cardValues[0] != cardValues[1] || cardValues[1] != cardValues[2])
                    {
		                this.showMessage(_("Triples must match"), 'error');
		                return;
		            }
		            if (cardValues[0] * 10 <= this.maxCardValue) {
		                this.showMessage(_("Must play a higher triple"), 'error');
		                return;
		            }
		            break;
		        case 3: //full house
		            if (items.length != 5) {
		                this.showMessage(_("Play type is full house"), 'error');
		                return;
		            }
                    //sorted values - first and second card match, 4th and 5th match, middle value must match
                    //one of the two either side
		            if (cardValues[0] != cardValues[1] || cardValues[3] != cardValues[4] ||
                        (cardValues[2] != cardValues[1] && cardValues[2] != cardValues[3]))
                    {
                        this.showMessage(_("Full House must be a triple and a pair"), 'error');
		                return;
		            }
		            if (cardValues[2] * 10 <= this.maxCardValue) { //value is the triple card in full house
		                this.showMessage(_("Must play a higher full house"), 'error');
		                return;
		            }
		            break;
		        case 4: //consecutive pairs
		            if (items.length % 2 != 0) {
		                this.showMessage(_("Play type is consecutive pairs"), 'error');
		                return;
		            }
		            for (i = 0; i < items.length; i = i+2) {
		                if (cardValues[i] != cardValues[i + 1]) {
		                    this.showMessage(_("Consecutive pairs cannot contain unpairds cards"), 'error');
		                    return;
		                }
		                if (i > 0 && cardValues[i] - cardValues[i-2] != 1) {
		                    this.showMessage(_("All pairs must be consecutive"), 'error');
		                    return;
		                }
		            }
                    if (cardValues[items.length-1] * 10 <= this.maxCardValue) {
		                this.showMessage(_("Must play higher consecutive pairs"), 'error');
		                return;
		            }
                    break;
		        case 5: //run
		        case 6: //run
		        case 7: //run
		        case 8: //run
		        case 9: //run
		        case 10: //run
		        case 11: //run
		        case 12: //run
		        case 13: //run
		        case 14: //run
		            if (items.length < 5) {
		                this.showMessage(_("Play type is straight"), 'error');
		                return;
		            } //todo length check
		            for (i = 0; i < items.length; i++) {
		                if (i > 0 && cardValues[i] - cardValues[i - 1] > 1) {
		                    this.showMessage(_("All cards in the straight must be consecutive"), 'error');
		                    return;
		                }
                    }
		            if (cardValues[items.length - 1] * 10 <= this.maxCardValue) {
		                this.showMessage(_("Must play a higher straight"), 'error');
		                return;
		            }
		            break;
                default :
                {
                    this.showMessage(_("Unhandled play type"), 'error');
                    return;
                }
			}

			// Build Ajax concatenated string collection of card to play
			var to_play = '';
			for( var i in items ) {
				to_play += items[i].id + ';' ;
			}

			console.log('to_play:', to_play);

			// Send the played cards to server, to be validated by playCards(), this is received back to client 
			// by the notifyAllPlayers as defined in js:312 & operated on in notif_playCards(js:332) below
			this.ajaxcall( "/tichu/tichu/playCards.html", 
				{ cards: to_play, lock: true }, this, function(result){}, function(is_error){} );
			this.playerHand.unselectAll(); // Might not be necessary
		},
		onResetPassCards: function () {
		    if (this.checkAction('passCards')) {
                for (var i = 0; i < this.cardsToPass.length; i++) {
		            var card_id = this.cardsToPass[i].id;
		            var player_id = this.player_id;
		            this.slideToObjectAndDestroy('cardontable_' + player_id + '_' + card_id, 'myhand', 1000, 0);
		            this.playerHand.addToStockWithId(this.cardsToPass[i].type, this.cardsToPass[i].id);
		        }

		        this.cardsToPass = [];
		    } 
		},
		onPassCards: function () {
            if (this.checkAction('passCards')) {
	    		
		        var items = this.cardsToPass;
		        if( items.length !== 3 ) {
					this.showMessage( _("You must select exactly 3 cards"), 'error' );
					return;
		        }

                // Give these 3 cards
				var to_give = '';
				for (var i in items) {
				    dojo.destroy('cardontable_' + this.player_id + '_' + items[i].id);
				    to_give += items[i].id+';';
				}
		        console.log("passing: " + to_give);
				this.ajaxcall("/tichu/tichu/giveCards.html", { 
				    cards: to_give, lock: true
				}, this, function (result) { }, function (is_error) { });
                    
		    }
		},
		onCallGrandTichu: function () {
		    if (this.checkAction('callGrandTichu')) {
		        this.ajaxcall("/tichu/tichu/callGrandTichu.html", {
		            lock: true
		        }, this, function (result) { }, function (is_error) { });
		    }
		},
		onPassGrandTichu: function () {
		    if (this.checkAction('passGrandTichu')) {
		        this.ajaxcall("/tichu/tichu/passGrandTichu.html", {
		            lock: true
		        }, this, function (result) { }, function (is_error) { });
		    }
		},
		onPassPlay: function() {
			if( this.checkAction('passPlay') ) {
				console.log('onPassPlay');
				var items = this.playerHand.getSelectedItems();
				if( items.length > 0 ) {
					this.showMessage( _("You must unselect cards to pass"), 'error' );
					return;
				} else if ( this.gamedatas.cardsontable && this.gamedatas.cardsontable.length === 0) {
					this.showMessage( _("You must start the hand"), 'error' );
					return;
				}
				this.ajaxcall("/tichu/tichu/passPlay.html", {}, this, function(result){}, function(is_error){} );
			}
		},
		
		///////////////////////////////////////////////////
		//// Reaction to cometD notifications
		/*  setupNotifications:
		 In this method you associate each of your game notifs with your local method to handle it. Note:game
		 notif names correspond to your "notifyAllPlayers" & "notifyPlayer" calls in your tichu.game.php file.*/
		setupNotifications: function() {
		    console.log('notifications subscriptions setup');
		    dojo.subscribe('addToHand', this, "notif_addToHand");
			dojo.subscribe( 'newHand',	  this, "notif_newHand" );
			dojo.subscribe( 'playCards', this, "notif_playCards" );
			dojo.subscribe( 'trickWin',  this, "notif_trickWin" );
			this.notifqueue.setSynchronous( 'trickWin', 1000 );
			dojo.subscribe( 'giveAllCardsToPlayer', this, "notif_giveAllCardsToPlayer" );
			dojo.subscribe( 'newScores', this, "notif_newScores" );
			dojo.subscribe( 'giveCards', this, "notif_giveCards" );
			dojo.subscribe( 'takeCards', this, "notif_takeCards" );
			dojo.subscribe( 'grandTichuCall', this, "notif_callGrandTichu" );
		},
		
	    // TODO: from this point and below, you can write your game notifications handling methods
		notif_callGrandTichu: function (notif) { 
			// Add to player's name on game table
			player_id=notif.args.player_id;
			// player_name=notif.args.player_name;
			// Add a label that can be removed on new hand
			//dojo.place( "<label class='lblGT'> (Grand Tichu)</label>", )
			// Slide or place a "GT" icon on players table
			console.log('GT call by:'+player_id);
			dojo.place( // This inserts HTML with variable parameters onto a player's table
				'<label id="lblCallTichu">Grand Tichu!</label>', 'playertichucall_'+player_id );
		    // Move Tichu call (logo or text) from player panel
			// this.placeOnObject('tichucall'+player_id+'_'+card_id,'overall_player_board_'+player_id);

            // move it to its final destination
			// this.slideToObjectPos('tichucall'+player_id+'_'+card_id,'playertichucall_'+player_id,leftOffset, topOffset).play();


		},
		notif_addToHand: function (notif) { // We received the last 6 cards.
		    
		    //Create a pile of cards, and deal 14 to each player

		    for (var i in notif.args.cards) {
		        var card = notif.args.cards[i];
		        var color = card.type;
		        var value = card.type_arg;
		        this.playerHand.addToStockWithId(this.getCardUniqueId(color, value), card.id);
		    }
		},
		notif_newHand: function (notif) { // We received a new hand of 8 cards.
		    this.playerHand.removeAll();

            //Create a pile of cards, and deal 14 to each player

            for( var i in notif.args.cards ) {
				var card = notif.args.cards[i];
				var color = card.type;
				var value = card.type_arg;
				this.playerHand.addToStockWithId( this.getCardUniqueId( color, value ), card.id );
			}            
		},
		// This is called by dojo redirection from playCards() in tichu.game.php:292
		notif_playCards: function (notif) { // Play a card on the table
		    //todo - currently this ignores the card_order in the db
            //this will need to be fixed when two pairs & runs are implemented.
		    console.log('notif_playCards', notif);
		    x = notif.args;
		    for (var i = 0; i < x.card_ids.length; i++) {
		        this.playCardOnTable(x.player_id, x.color[i], x.value[i], x.card_ids[i], x.cards_order + i, x.plays_order); // Goto 140
		    }
		},
		notif_trickWin: function( notif ) {
			// We do nothing here (just wait in order players can view played cards before they're given to winner.
		},
		notif_giveAllCardsToPlayer: function(notif){ // Visually move all cards on table to winner, destroy them
			var winner_id = notif.args.player_id;
			var cards_won = notif.args.cards_won;console.log(cards_won);
			for( var card in cards_won ) {
				var anim=this.slideToObject('cardontable_'+cards_won[card].location_arg+'_'+cards_won[card].id,'overall_player_board_'+winner_id);
				dojo.connect( anim, 'onEnd', function( node ) { dojo.destroy(node); } );
				anim.play();
			}
		},
		notif_newScores: function( notif ) { // Update players' scores
			for( var player_id in notif.args.newScores ) {
				this.scoreCtrl[ player_id ].toValue( notif.args.newScores[ player_id ] );
			}
		},
		notif_giveCards: function( notif ) { // Remove cards from the hand (they have been given)
			for( var i in notif.args.cards ) {
				var card_id = notif.args.cards[i];
				this.playerHand.removeFromStockById( card_id );
			}
		},
		notif_takeCards: function( notif ) { // Cards taken from some opponent
			for( var i in notif.args.cards ) {
				var card = notif.args.cards[i];
				var color = card.type;
				var value = card.type_arg;
				this.playerHand.addToStockWithId( this.getCardUniqueId( color, value ), card.id );
			}
		}
   });             
});