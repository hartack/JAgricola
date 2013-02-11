// ==UserScript==
// @name        JAgricola
// @namespace   JAgricola
// @description Agricola sites translates to Japanese.
// @include     http://www.boiteajeux.net/jeux/agr/*
// @version     1.2
// @require     http://code.jquery.com/jquery-1.8.2.js
// @require     https://raw.github.com/cho45/jsdeferred/master/jsdeferred.userscript.js
// @grant       hoge
// ==/UserScript==

(function() {

    // class
    var Action = function(round, player, action) {
        this.round = round;
        this.player = player;
        this.action = action;
    };

    // global variable
    var cardJson = initializeCardJson();
    var agrid = getAgricolaId();
    var lastTurn = 0;
    var ajaxmsec = 10 * 1000;
    var yourTurnMsg = "Choose an action in the first tab on the left !";
    var yourFeedingMsg = "Last chance to make room for your new born animals, it will be too late during the breeding phase!":
    var reload = !($('.clInfo').html().match(yourTurnMsg) || $('#dvGererAlimentationContent').html().match(yourFeedingMsg));
    var AUDIO_LIST = {
        "bell": new Audio("http://heaven.gunjobiyori.com/up1157.wav")
    };
    
    // main functions
    createCardSpace();
    createCards();
    createDraftCards();
    createPlayCards();
    hackShowExp();
    setAjaxHistory();

    function createCardSpace() {
        $("#conteneur").after('<div id="jagmsg" style="margin:5px; padding:5px;" />');
        $("#jagmsg").append('<div id="plays"><h3>プレイカード</h3></div>').append('<div id="hands"><h3>手札</h3></div>');
        $("#plays").append('<dl id="played"><dt></dt></dl>');
        $("#hands").append('<dl id="minor" />').append('<dl id="occup" />');
        $("#minor").append('<dt style="color:#314D31;font-weight:bold;">小進歩</dt>');
        $("#occup").append('<dt style="color:#314D31;font-weight:bold;">職業</dt>');
        $("#playminor").append('<dt style="color:#314D31;font-weight:bold;">小進歩</dt>');
        $("#playoccup").append('<dt style="color:#314D31;font-weight:bold;">職業</dt>');
        $("form[name=fmDraft]").before('<div id="active" />');
        $("form[name=fmMiniForum]").after('<table id="history" border="0" cellpadding="1" cellspacing="1" width="250"><thead><th class="clEntete">Round</th><th class="clEntete">Player</th><th class="clEntete">Action</th></thead><tbody></tbody></table>');
    }

    function createCards() {
        $("#played").empty();

        var minors = $('.tableauAmelioration table:eq(0) td');
        var cardname = "";
        minors.each(function(i) {
            cardname = minors[i].title;

            $("#minor").append("<dd>" + createCardDesc(cardname) + "</dd>");
        });

        var occups = $('.tableauAmelioration table:eq(1) td');
        occups.each(function(i) {
            cardname = occups[i].title;

            $("#occup").append("<dd>" + createCardDesc(cardname) + "</dd>");
        });
    }

    function createPlayCards() {
        $("#played").empty();
        var plays = $("#tabCartesPosees td");
        var cardname = "";
        plays.each(function(i) {
            cardname = plays[i].title;

            $("#played").append("<dd>" + createCardDesc(cardname) + "</dd>");
        });
    }

    function createCardDesc(cardname) {
        var cardnumber = getCardNumber(cardname)[0];
        return cardJson[cardnumber];
    }

    function createDraftCards() {
        var drafts = $("form[name=fmDraft] div.clCarteMf");
        var cardname = "";
        drafts.each(function(i) {
            $(drafts[i]).hover(function() {
                $("#active").text(createCardDesc(this.title));
            });
        });
    }

    function hackShowExp() {
        $('a[href*="showExp"]').each(function() {
            var target = this.href.match(/showExp\((\d+)\)/);
            target = RegExp.$1;
            this.href = "#";
            $(this).click(function() {
                showExpPlus(target);
            });
        });
    }

    function showExpPlus(piJ) {
        $('#dvExploitation').load('agrajax.php?id=' + agrid + '&j=' + piJ + '&a=exploitation');
        $.get('agrajax.php', { id : agrid, j : piJ.toString(), a : "cartes" }, function(data) {
            var newHtml = $(data);
            $('#dvCartesPosees').html(newHtml);
            createPlayCards();
        });
        $('#dvAttente').load('agrajax.php?id=' + agrid + '&j=' + piJ + '&a=attente');
    }
    
    function setAjaxHistory() {
        if (reload) {
            $.get('partie.php', { id : agrid }, function(data) {
                if (data.match(yourTurnMsg) || data.match(yourFeedingMsg)) {
                    AUDIO_LIST["bell"].play();
                    alert("It's your turn!");
                    
                    location.href = location.href.replace(/#$/, "");
                }
            });
        }
    
        $.get('historique.php', { id : agrid }, function(data) {
            
            var players = getPlayers(data);
            var actions = getActions(data, players);
            
            if (lastTurn == 0 && actions.length >= 5) {
                lastTurn = actions.length - 5;
            }
            
            for (i = lastTurn; i < actions.length; i = i + 1) {
                var act = actions[i];
                addAction(act);
            }
            
            lastTurn = actions.length;
        }); 
        
        setTimeout(setAjaxHistory, ajaxmsec);
    }
    
    function addAction(act) {
        $("#history tbody").prepend("<tr><td style=\"text-align: center;\">" + act.round + "</td><td>" + act.player + "</td><td>" + act.action + "</td></tr>");
    }
    
    function getPlayers(data) {
        var headers = data.match(/<th .+?<\/th>/g);
        var players = [];
        for (i = 0; i < headers.length; i = i + 1) {
            if (i == 0) {
                continue;
            }
            if (headers[i].match(/div>&nbsp;(.+)<div/)) {
                players[i-1] = RegExp.$1;
            }
        }
        
        return players;
    }

    function getActions(data, players) {
        var actions = [];
        var rounds = [];
        var round = 0;
        var n = 0;
        var player = 0;
        var act = "";
        var rows = data.match(/<tr .+?<\/tr>/g);
        for (i = 0; i < rows.length; i = i + 1) {
            var datas = rows[i].match(/<td .+?<\/td>/g);
            for (j = 0; j < datas.length; j = j + 1) {
                
                if (datas.length != players.length && j == 0) {
                    round = round + 1;
                    continue;
                }
                
                if (datas[j].match("&nbsp;")) {
                    continue;
                }
                
                player = j;
                if (datas.length != players.length) {
                    player = j - 1;
                }
                
                if (datas[j].match(/>(\d+)<\/div>(.+)<\/td>/)) {
                    n = RegExp.$1;
                    act = RegExp.$2;
                    
                    actions[Number(n) - 1] = new Action(round, players[player], act);
                }
            }
        }
        
        return actions;
    }

    function getAgricolaId() {
        return document.location.href.match(/\d+/)[0];
    }

    function getCardNumber(cardname) {
        return cardname.match(/^\d+/);
    }

    /*
     * 一旦コメントアウト。いらなそー。
     translateMessages();
     function translateMessages() {
     document.body.innerHTML = document.body.innerHTML
     .replace("Choose an action in the first tab on the left !", "左の一番上のタブからアクションを選んでね。")
     .replace("In the second tab you can generate Food if you have some facilities to do it.", "かまどがあれば、二番目のタブでいつでも家畜を食料に変えられるよ")
     .replace("House building and/or stables building", "増築 and/or 厩")
     .replace("Starting player and/or Minor Improvement", "スタプレ and/or 小進歩")
     .replace("Sow<br>and/or<br>Baking bread", "種を蒔く and/or パンを焼く")
     .replace("Ploughing", "畑")
     .replace("Grain", "小麦")
     .replace("Occupation", "職業")
     .replace("Day labourer", "日雇い")
     .replace("Wood", "木");
     }
     */

    function initializeCardJson() {
        var json = {
            "1" : "1 かまど 以下の品をいつでも食料にできる。野菜：2　羊：2　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2",
            "2" : "2 かまど 以下の品をいつでも食料にできる。野菜：2　羊：2　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2",
            "3" : "3 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3",
            "4" : "4 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3",
            "5" : "5 レンガ暖炉 「パンを焼く」のアクションのたびに、小麦最大1を食料5にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。",
            "6" : "6 石の暖炉 「パンを焼く」のアクションのたびに、小麦最大2までそれぞれ食料4にできる。このカードの獲得のとき、追加アクションで「パンを焼く」ができる。",
            "7" : "7 家具製作所 収穫のたびに木材最大1を食料2にできる。ゲーム終了時に木材3/5/7でそれぞれ1/2/3点のボーナスを得る。",
            "8" : "8 製陶所 収穫のたびにレンガ最大1を食料2にできる。ゲーム終了時にレンガ3/5/7でそれぞれ1/2/3点のボーナスを得る。",
            "9" : "9 かご製作所 収穫のたびに葦最大1を食料3にできる。ゲーム終了時に葦2/4/5でそれぞれ1/2/3点のボーナスを得る。",
            "10" : "10 井戸 これ以降の5ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。",
            "11" : "11 畑 このカードを出したらすぐ畑を最大1つ耕す。 コスト: 食1 移動進歩",
            "12" : "12 釣竿 「漁」のアクションのたびに、追加で食料1を得る。ラウンド8からは追加で食料2を得る。 コスト: 木1",
            "13" : "13 斧 木の家の増築はいつも木材2と葦2でできる。 コスト: 木1・石1",
            "14" : "14 パン焼き暖炉 「パンを焼く」のアクションのたびに、小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 暖炉1枚を返す",
            "15" : "15 パン焼き桶 レンガ暖炉と石の暖炉が小さい進歩になり好きな資材1つ安くなる。木の暖炉も資材1つ安くなる。 コスト: 木1",
            "16" : "16 建築資材 このカードを出したらすぐ木材１かレンガ1を得る。 移動進歩",
            "17" : "17 風車小屋 パンを焼かずにいつでも小麦1を食料2にできる。 コスト: 木3・石1",
            "18" : "18 マメ畑 種まきで、このカードの上に畑と同じように野菜を植えられる。（このカードは得点計算で畑に含めない） 条件: 職業2",
            "19" : "19 三つ足やかん かまど○の進歩で2つの品物を食料にするたびに食料をもう1つ得る。 コスト: レ2",
            "20" : "20 簡易かまど 以下の品をいつでも食料にできる。野菜：2　羊：1　猪：2　牛：3　「パンを焼く」のアクションで、小麦：2 コスト: レ1",
            "21" : "21 木骨の小屋 ゲーム終了時に石の家の広さ1スペースにつき、ボーナス1点を得る。（ヴィラと両方持っている場合、ヴィラのボーナスのみ得る。） コスト: 木1・レ1・葦1・石2",
            "22" : "22 いかだ 「漁」のアクションのたびに追加の食料1か葦1を得る。 コスト: 木2",
            "23" : "23 かいば桶 ゲーム終了時に、牧場の広さの合計が6/7/8/9マス以上で、ボーナス1/2/3/4点を得る。 コスト: 木2",
            "24" : "24 檻 これ以降のラウンドのスペース全部にそれぞれ食料2を置く。これらのラウンドのはじめにその食料を得る。 コスト: 木2 条件: 職業4",
            "25" : "25 スパイス かまど○の進歩カードで野菜を食料にするたびに追加で食料1を得る。",
            "26" : "26 かんな 家具製作所・製材所・家具職人で、木材1を食料に換えると追加で食料1を得る。あるいは木材をもう1つ払って食料2に換えられる。 コスト: 木1",
            "27" : "27 木の暖炉 「パンを焼く」のアクションのたびにいくつでも小麦1つにつき食料3にできる。このカードを出してすぐに追加で「パンを焼く」アクションができる。 コスト: 木3・石1",
            "28" : "28 木のスリッパ ゲーム終了時に、レンガの家でボーナス1点、石の家でボーナス2点を得る。 コスト: 木1",
            "29" : "29 角笛 厩の有無に関わらず、羊のいる牧場はそれぞれ追加で2頭まで飼える。柵で囲んでいない厩は羊2頭まで飼える。（この効果は家畜庭、動物園にも適用される） 条件: 羊1",
            "30" : "30 カヌー 「漁」のアクションのたびに、追加で食料1と葦1を得る。 コスト: 木2 条件: 職業2",
            "31" : "31 鯉の池 これ以降の奇数ラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業1・進歩2",
            "32" : "32 じゃがいも掘り 種をまくたびに、野菜を新しく植えた畑全部にもう1つ野菜を置く。 コスト: 木1",
            "33" : "33 陶器 このカードを出すとすぐに食料2を得る。今後、製陶所は小さい進歩になり無料で作れる。 コスト: レ1 条件: 暖炉1",
            "34" : "34 かご スペースから木材を取るアクションのたびに、木材2をそのスペースに残して食料3を得ることができる。 コスト: 葦1",
            "35" : "35 穀物スコップ 「小麦を取る」のアクションのたびに、小麦をもう1つ得る。 コスト: 木1",
            "36" : "36 レンガの屋根 増築か改築をするとき、葦1または2を同数のレンガで代用できる。 条件: 職業1",
            "37" : "37 レンガの柱 レンガの家を増築するたびに、レンガ5と葦2をレンガ2と木材1と葦1で代用できる。 コスト: 木2",
            "38" : "38 聖マリア像 効果なし。（捨てた進歩カードによって得られるはずだった品物は全てなくなる） コスト: プレイ済み進歩2",
            "39" : "39 露店 このカードを出したらすぐ野菜1を得る。 コスト: 麦1 移動進歩",
            "40" : "40 小牧場 このカードを出したらすぐ1スペースを柵で囲んで牧場にする。（柵のコストの木材は不要） コスト: 食2 移動進歩",
            "41" : "41 石臼 パンを焼いて小麦を食料にするたびに、追加で食料2を得る。（パンを焼くアクション1回につき食糧2） コスト: 石1",
            "42" : "42 親切な隣人 このカードを出したらすぐ、石材1か葦1を得る。 コスト: 木1/レ1 移動進歩",
            "43" : "43 果物の木 ラウンド8-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3",
            "45" : "45 個人の森 これ以降の偶数ラウンドのスペースに、それぞれ木材1を置く。これらのラウンドのはじめにその木材を得る。 コスト: 食2",
            "46" : "46 荷車 ラウンド5・8・11・14のうちまだ始まっていないラウンドのスペースに、それぞれ小麦1を置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木2 条件: 職業2",
            "47" : "47 レタス畑 このカードの上に種まきのとき畑と同じように野菜を植えられる。ここから収穫してすぐに食料にすると食料4になる。（このカードは得点計算で畑に含めない） 条件: 職業3",
            "48" : "48 葦の池 これ以降の3ラウンドのスペースにそれぞれ葦1を置く。これらのラウンドのはじめにその葦を得る。 条件: 職業3",
            "49" : "49 書き机 「職業」のアクションで、2つの職業を続けて出せる。2枚目の職業を出すには、1枚目のコストに加えてさらに食料2を支払う。 コスト: 木1 条件: 職業2",
            "50" : "50 へら 「改築」のアクションなしに、木の家をいつでもレンガの家に改築できる。（資材は支払う） コスト: 木1",
            "51" : "51 糸巻き棒 収穫で畑フェイズのたび羊を3匹持っていれば食料1、5匹持っていれば食料2を得る。 コスト: 木1",
            "52" : "52 厩 このカードを出したらすぐ厩を1つ無料で建てる。 コスト: 木1 移動進歩",
            "53" : "53 撹乳器 収穫で畑フェイズのたびに羊がいれば羊3匹につき食料1を得る。同じく牛がいれば牛2匹につき食料1を得る。 コスト: 木2",
            "54" : "54 石切り場 「日雇い労働者」のアクションのたびに、追加で石材3を得る。 条件: 職業4",
            "55" : "55 石の家増築 このカードを出したらすぐ、石の家が1スペース増築される。 コスト: 葦1・石3 移動進歩",
            "56" : "56 石ばさみ ラウンド5-7か、ラウンド10-11で登場する「石材」のアクションのたびに、石材をもう1つ得る。 コスト: 木1",
            "57" : "57 ハト小屋 ラウンド10-14のうちまだ始まっていないラウンドのスペースに、それぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 石2",
            "58" : "58 家畜庭 このカードの上に好きな動物を2頭置ける。種類が異なっていても良い。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業1",
            "59" : "59 水飲み場 厩の有無に関わらず、自分の牧場は全て家畜が2頭多く入るようになる。（この効果は家畜庭、動物園にも適用される） コスト: 木2",
            "60" : "60 家畜市場 このカードを出したらすぐ牛1を得る。 コスト: 羊1 移動進歩",
            "61" : "61 鋤車 ゲーム中2回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木4 条件: 職業3",
            "62" : "62 折り返し鋤 ゲーム中1回、「畑を耕す」か「畑を耕して種をまく」アクションで、畑を3つまで耕せる。 コスト: 木3 条件: 職業2",
            "338" : "338 強力餌 収穫で食料供給フェイズのたびに、野菜1（最大1つまで）で自分の農場にいる家畜を1匹増やす。",
            "44" : "44 離れのトイレ 効果なし。他の人の中に、職業2つ未満の人がいるときのみに建てられる。 コスト: 木1・レ1 条件: 以下の条件",
            "63" : "63 突き鋤 ゲーム中に2回、「畑を耕す」のアクションで耕せる畑が１つから2つになる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木2 条件: 職業1",
            "64" : "64 喜捨 このカードを出した時点で、既に終わっているラウンド数だけ食料を得る。 条件: 職業なし 移動進歩",
            "65" : "65 パン焼き部屋 「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石2",
            "66" : "66 村の井戸 これ以降の3ラウンドのスペースにそれぞれ食料1を置く。これらのラウンドのはじめにその食料を得る。 コスト: 井戸を返す",
            "67" : "67 脱穀そり 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションが行える。 コスト: 木2 条件: 職業2",
            "68" : "68 馬鍬 ゲーム中に1回だけ、「畑を耕す」か「畑を耕して種をまく」のアクションで耕せる畑が1つから2つになる。他の人もゲーム中に1回だけ、手番にあなたに食料2を払って同じことができる。 コスト: 木2",
            "69" : "69 イチゴ花壇 これ以降3ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑2",
            "70" : "70 地固め機 他の人が馬鍬か鋤類を使うたびに、すぐに畑1つを耕せる。 コスト: 木1",
            "71" : "71 別荘 ラウンド14で家族を一切使えない。このカードはラウンド13までに出すこと。 コスト: （木3/レ3）・葦2",
            "72" : "72 ガチョウ池 これ以降4ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業3",
            "73" : "73 ゲスト このカードを出したらゲストトークンを取り、次のラウンドに家族として1回だけ使用できる。 コスト: 食2 移動進歩",
            "74" : "74 小麦車 「小麦1を取る」のアクションのたびに、追加で小麦2を得る。 コスト: 木2 条件: 職業2",
            "75" : "75 手挽き臼 収穫で食糧供給フェイズのたびに小麦1を食料2にするか、小麦2を食料4にできる。 コスト: 石1",
            "76" : "76 くまで ゲーム終了時に畑が5つ以上あればボーナス2点を得る。くびき・馬鍬・地固め機・鋤類のいずれかを出していれば畑が6つ必要。 コスト: 木1",
            "77" : "77 牧人の杖 区切られていない4スペース以上の牧場を新たに囲むたびに、その牧場に羊2頭を置く。 コスト: 木1",
            "78" : "78 雑木林 「種をまく」のアクションのたびに、このカードの上に木材を植えることができる。最大2つまで植えることができる。木材は畑の小麦のように扱い、畑フェイズで収穫する。（このカードは得点計算で畑に数えない） コスト: 木2 条件: 職業1",
            "79" : "79 木材荷車 アクションで木材を取るたびに、追加で木材2を得る。（この効果は木材が累積するスペースから木材を得た時のみ） コスト: 木3 条件: 職業3",
            "80" : "80 林 他の人が「木材3」のアクションを行うたびに、その中から1つをもらう。 コスト: 木1 条件: 職業3",
            "81" : "81 木の家増築 このカードを出したらすぐ木の家が1部屋増える。 コスト: 葦1・木5",
            "82" : "82 木のクレーン ラウンド5-7とラウンド10-11で登場する「石材1」のアクションのたびに、追加で石材1を得る。そのとき食料1を払えば追加分が石材1から石材2になる。 コスト: 木3",
            "83" : "83 林道 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 木1",
            "84" : "84 鶏小屋 これ以降の8ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 コスト: （木2/レ2）・葦1",
            "85" : "85 調理コーナー 以下の品をいつでも食料にできる。野菜：4　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: 調理場を返す",
            "86" : "86 乾燥小屋 畑フェイズの後で空いている畑があれば、すぐに小麦を植えられる。ただし置く小麦は1つ少なくなる。 コスト: （木2/レ2）・葦2",
            "87" : "87 かめ 誰かが井戸を作るか村の井戸に改良するたびに、他の人は食料1、自分は食料4を得る。（すでに井戸がある場合はカードを出したときに得る） コスト: レ1",
            "88" : "88 投げ縄 家族を続けて2人置ける。ただしそのうち少なくとも1人は「猪1」「牛1」「羊1」のいずれかに置くこと。 コスト: 葦1",
            "89" : "89 レンガ道 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: レ3",
            "90" : "90 プランター 家と接する畑に種をまくたびに、その畑に追加で小麦2か野菜1が置かれる。 条件: 職業2　",
            "91" : "91 はしご 増築や改築、水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋を作るたびに、コストの葦を1つ減らせる。 コスト: 木2",
            "92" : "92 堆肥 収穫しないラウンドの最後でも、全ての畑から小麦1か野菜1を取ることができる。（収穫する場合は全ての畑から収穫しなければならない） 条件: 家畜2",
            "93" : "93 酪農場 収穫で畑フェイズのたびに、はじめに全員の農場にいる全ての羊と牛を数える。羊5頭、牛3頭につきそれぞれ食料1を得る。 コスト: レ2・石3",
            "94" : "94 舗装道路 最も価値の高い道を持っている人（自分以外の場合も）は得点計算でボーナス2点を得る。 コスト: 石5",
            "95" : "95 梁 「漁」か葦を取るアクションのたびに追加で食料1を得る。 コスト: 木1",
            "96" : "96 葦の交換 このカードを出したらすぐに葦2を得る。 コスト: 木2/レ2 移動進歩",
            "97" : "97 畜殺場 他の人が家畜を1頭以上、食料にするたびにストックから食料1を得る。食糧供給フェイズでは手番が最後になる。 コスト: レ2・石2",
            "98" : "98 火酒製造所 収穫で食糧供給フェイズのたびに野菜最大1を食料4にできる。ゲーム終了時に5つ目と6つ目の野菜1つにつき、それぞれボーナス1点を得る。 コスト: 野1・石2",
            "99" : "99 わら小屋 増築や改築を行うときに、葦がもう不要になる。 条件: 小麦畑3",
            "100" : "100 酒場 このカードは追加のアクションスペースになる。ここで他の人がアクションを行うと食料3を得る。自分でアクションを行うと、食料3かボーナス2点のどちらかを得る。 コスト: 木2・石2",
            "101" : "101 家畜の餌 得点計算の直前に、1匹以上所有している家畜の種類ごとに1匹ずつ増える。（農場内に置き場所が必要） 条件: 栽培中の畑4",
            "102" : "102 動物園 このカードの上に羊と猪と牛を各1頭ずつまでおくことができる。（このカードは得点計算で牧場に含めない） コスト: 木2 条件: 職業2",
            "103" : "103 水車 全員が畑フェイズのたびに小麦最大1を食料3にできる。他の人がこれを行ったら、その中から食料1をもらう。 コスト: 木1・レ2・葦1・石2",
            "104" : "104 週末市場 このカードを出したらすぐに野菜2を得る。 コスト: 麦3 移動進歩",
            "337" : "337 レンガ置き場 このカードは全員が使えるアクションスペースになる。ここを使うと持ち主に食料1を払ってストックからレンガ5を得る。持ち主が使うとレンガ5か2点を得る。 条件: 職業3",
            "105" : "105 平地 種をまくとき、畑2つに植えるようにしてこのカードの上に小麦2を植えることができる。（このカードは得点計算で畑に含めない） 条件: 職業1",
            "106" : "106 パン焼き小屋 「パンを焼く」のアクションのたびに小麦2つまでをそれぞれ食料5にできる。このカードを出してすぐに追加で「パンを焼く」のアクションができる。 コスト: 暖炉1枚を返す・石3",
            "107" : "107 建築用木材 このカードを出したらすぐに、木材3を得る。 コスト: 石1 移動進歩",
            "108" : "108 ミツバチの巣 これ以降の偶数ラウンドのスペースに、それぞれ食料を2つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 進歩2・職業3",
            "109" : "109 焼き串 収穫で食糧供給フェイズのたびに家畜を1頭以上食料にすると、追加で食料1を得る。 コスト: 木1",
            "110" : "110 醸造所 収穫で食糧供給フェイズのたびに、小麦最大1を食料3にできる。ゲーム終了時に収穫した小麦が9つ以上あればボーナス1点を得る。 コスト: 麦2・石2",
            "111" : "111 パン焼き棒 職業を出すたびに、続けて「パンを焼く」のアクションができる。 コスト: 木1",
            "112" : "112 本棚 職業を1つ出すたびに食料3を得る。この食料は、その職業を出すコストに使用できる。 コスト: 木1 条件: 職業3",
            "113" : "113 脱穀棒 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに追加で「パンを焼く」のアクションができる。 コスト: 木1 条件: 職業1",
            "114" : "114 鴨の池 これ以降の3ラウンドのスペースに食料をそれぞれ1つずつ置く。これらのラウンドの最初にその食料を得る。 条件: 職業2",
            "115" : "115 耕運鋤 ゲーム中2回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業3",
            "116" : "116 穀物倉庫 ラウンド8・10・12のうちまだ始まっていないラウンドのスペースに小麦を1つずつ置く。これらのラウンドのはじめにその小麦を得る。 コスト: 木3/レ3",
            "117" : "117 温室 現在のラウンドに4と7を足す。そのラウンドのスペースにそれぞれ野菜を1つずつ置き、ラウンドのはじめに食料1を払えばその野菜を得る。 コスト: 木2 条件: 職業1",
            "118" : "118 肥溜め 種まきで毎回、新しく植えた畑に小麦1か野菜1を追加で置く。 条件: 家畜4",
            "119" : "119 鉤型鋤 ゲーム中1回、「畑を耕す」のアクションで、畑を3つまで耕せる。「畑を耕して種をまく」のアクションでは使えない。 コスト: 木3 条件: 職業1",
            "120" : "120 ヤギ 食糧供給フェイズのたびに食糧1を得る。自分の家にはこのヤギ以外の動物を飼えなくなる。（調教師があっても不可）",
            "121" : "121 木挽き台 自分の牧場におく次の厩と3・6・9・12・15本目の柵は無料になる。（柵は牧場を完全に囲む形でしか置けない） コスト: 木2",
            "122" : "122 製材所 収穫のたびに、木材最大1を食料3にできる。ゲーム終了時に木材2/4/5でそれぞれ1/2/3点のボーナスを得る。（この後にまた家具製作所を獲得してもボーナス点はない） コスト: 家具製作所を返す",
            "123" : "123 木の宝石箱 ゲーム終了時、家の広さが5部屋なら2点、6部屋なら4点のボーナスを得る。 コスト: 木1",
            "124" : "124 くびき このカードを出すとすぐに、場に出ている全ての鋤類の数だけ畑を耕せる。（自分で出している分は数えない） コスト: 木1 条件: 牛1",
            "125" : "125 ほうき 手札の小さい進歩を全て捨て、新たに7枚引く。そしてすぐにコストを支払い、1枚実行できる。 コスト: 木1",
            "126" : "126 柄付き網 アクションで葦を取るたび、追加で食料2を得る。葦以外に他の資材も同時に取る場合は、追加で食料1を得る。 コスト: 葦1",
            "127" : "127 がらがら 「家族を増やす」のアクションのたびに（またはこのカードを出したラウンドに新しい家族が生まれていたら）、小麦が1つ以上ある畑にさらに小麦1を置く。 コスト: 木1",
            "128" : "128 調理場 以下の品をいつでも食料にできる。野菜：3　羊：2　猪：3　牛：4　「パンを焼く」のアクションで、小麦：3 コスト: かまどを返す/レ4",
            "129" : "129 穀物の束 このカードを出したらすぐに小麦1を得る。 移動進歩",
            "130" : "130 薬草畑 これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 野菜畑1",
            "131" : "131 レンガ坑 「日雇い労働者」のアクションのたびに、追加でレンガ3を得る。 条件: 職業3",
            "132" : "132 レンガの家増築 このカードを出すとすぐに、レンガの家が1部屋増築される。 コスト: 葦1・レ4 移動進歩",
            "133" : "133 搾乳台 収穫の畑フェイズのたびに牛を1/3/5頭持っていればそれぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につきボーナス1点を得る。 コスト: 木1 条件: 職業2",
            "134" : "134 牛車 このカードを出したらすぐ、まだ始まっていないラウンドの数だけ（ただし最大3まで）畑を耕せる。 コスト: 木3 条件: 牛2",
            "135" : "135 ウマ ゲーム終了時、1種類の動物を1頭も持っていなかったら、ボーナス2点を得る。（いない家畜の代わりとして扱う。ただし、このカードの効果で家畜一種を補完した状態では、職業カード『村長』のボーナスを獲得できない。）",
            "136" : "136 柴屋根 増築や改築で、葦1か2を同数の木材に変えられる。 条件: 職業2",
            "138" : "138 葦の家 まだ登場していない家族コマをこのカードの上に置き、ゲーム終了時までここに住む。今のラウンドからアクションに使うことができ、食糧供給しなければならず、得点にならない。（後から「家族を増やす」のアクションで家に入れることができる） コスト: 木1・葦4",
            "139" : "139 寝室 他の人の家族が置いてあっても、家族を増やすアクションに家族を置いて実行できる。 コスト: 木1 条件: 小麦畑2",
            "140" : "140 白鳥の湖 これ以降の5ラウンドのスペースに食料を1つずつ置く。これらのラウンドのはじめにその食料を得る。 条件: 職業4",
            "142" : "142 石車 これ以降の偶数ラウンドのスペースに石材をそれぞれ1つずつ置く。これらのラウンドの最初にその石材を得る。 コスト: 木2 条件: 職業2",
            "143" : "143 石の交換 このカードを出したらすぐに、石材2を得る。 コスト: 木2/レ2 移動進歩",
            "144" : "144 ヴィラ ゲーム終了時、石の家1部屋につきボーナス2点を得る。（木骨の小屋とヴィラを持っている場合、ボーナス得点はヴィラのみになる） コスト: 木3・レ3・葦2・石3",
            "145" : "145 森の牧場 このカードの上に猪を何匹でも置ける。（このカードは得点計算で牧場に含めない） 条件: 職業3",
            "146" : "146 織機 畑フェイズのたびに羊を1/4/7頭持っていれば、それぞれ食料1/2/3を得る。ゲーム終了時に羊3頭につき1点のボーナスを得る。 コスト: 木2 条件: 職業2",
            "339" : "339 毛皮 食料にして共通のストックに戻した家畜1頭につき、食料1を自分のストックから取って部屋に置く。各部屋1食料ずつ置ける。この食料はもはや使うことができないが、ゲーム終了時にそれぞれボーナス1点に数える。 条件: 職業3",
            "137" : "137 カブ畑 種まきで、このカードの上に畑と同じように野菜を植えることができる。このカードを出したとき、追加で「種をまく」のアクションができる。（このカードは得点計算で畑に含めない） 条件: 職業3",
            "141" : "141 猪の飼育 このカードを出したらすぐに、猪1を得る。 コスト: 食1 移動進歩",
            "150" : "150 パン職人 収穫のたびにパン○の付いた進歩カードがあれば、食糧供給フェイズのはじめにパンを焼くことができる。このカードを出したときに、追加アクションとしてパンを焼くことができる。",
            "151" : "151 建築士 家が5部屋以上になったら、ゲーム中に1度だけ好きなタイミングで無料で1部屋増築できる。",
            "153" : "153 托鉢僧 ゲーム終了時に、物乞いカードを2枚まで返すことができ、返したカード分のマイナス点が入らない。",
            "162" : "162 肉屋 暖炉を持っていれば家畜をいつでも以下の割合で食料にできる。羊；2　猪：3　牛：4　",
            "171" : "171 港湾労働者 いつでも木材3をレンガ1か葦1か石材1のいずれかに交換できる。または、レンガ2/葦2/石材2のいずれかを好きな資材1と交換できる。",
            "172" : "172 族長 ゲーム終了時に石の家の1部屋につき1点追加ボーナス。このカードを出すには、追加で食料2が必要。",
            "173" : "173 族長の娘 他の人が「族長」を出したら、コスト無しでこのカードをすぐ出すことができる。ゲーム終了時に石の家なら3点、レンガの家なら1点を追加で得る。",
            "174" : "174 家庭教師 ゲーム終了時、このカードの後に出した職業1枚につき1点のボーナスを得る。",
            "175" : "175 柵管理人 柵を1つ以上置くたびに無料でさらに3つ置くことが出来る。（柵は牧場を完全に囲む形でしか置けない）",
            "176" : "176 木こり アクションで木材を取るたびに、追加で木材1を得る。",
            "179" : "179 販売人 「小さい進歩」か「小さい/大きい進歩」のアクションのたびに、食料1を払えばもう1回このアクションをできる。",
            "184" : "184 小売人 このカードの上に下から野菜・葦・レンガ・木材・野菜・石材・小麦・葦を1つずつ順番に重ねる。食料1でいつでも一番上の商品を買える。",
            "187" : "187 レンガ運び ラウンド6-14のうちまだ始まっていないラウンドのスペースに、1つずつレンガを置く。これらのラウンドのはじめにそのレンガを得る。",
            "188" : "188 レンガ混ぜ アクションでレンガだけを取るたびに、レンガ2を追加で得る。",
            "189" : "189 君主 ゲーム終了時に、各カテゴリーで4点まで到達すれば、それぞれ1点のボーナスを得る。（柵で囲まれた厩を4つ以上作った場合も含む）",
            "190" : "190 メイド レンガの家に住み次第、それ以降のラウンドのスペースに食料1を置く。これらのラウンドの最初にその食料を得る。（すでにレンガか石の家に住んでいれば、すぐに食料を置く）",
            "191" : "191 左官屋 石の家が4部屋以上になったら、1回だけ好きなときに1部屋を無料で増築できる。",
            "194" : "194 鋤職人 石の家を持つと、毎ラウンドのはじめに食料1を払って畑を最大1つ耕すことができる。",
            "195" : "195 鋤鍛冶 「畑を耕す」か「畑を耕して種をまく」のアクションのたびに、食料1で耕す畑を1つ（最大１つまで）追加できる。",
            "196" : "196 キノコ探し アクションスペースにある木材を取るたび、その中から1つ取らずに残して代わりに食料2を得ることができる。",
            "199" : "199 改築屋 レンガの家に改築するときレンガが2つ少なくてよい。石の家に改築するとき石材が2つ少なくてよい。",
            "200" : "200 修理屋 木の家をレンガの家にせず、直接石の家に改築できる。",
            "202" : "202 季節労働者 「日雇い労働者」のアクションのたびに追加で小麦1を得る。ラウンド6からは小麦1でなく野菜1にしてもよい。",
            "207" : "207 厩番 柵を1つ以上置くたびに無料で厩を1つ手に入れすぐに置く。（置く場所は柵の内側でも外側でもよい）",
            "208" : "208 厩作り 柵で囲んでいない厩に、同じ家畜を3匹まで置くことが出来る。",
            "210" : "210 石運び アクションで石材を取るたびに追加でもう1つ得る。石材以外も取るときは、追加の石材を得るのに食料1を払う。",
            "218" : "218 大工 家の資材3と葦2で増築できる。",
            "147" : "147 畑商人 「野菜1を取る」のアクションのたびに追加で小麦1を取る。このカードを出したときにストックから野菜1を得る。",
            "148" : "148 大学者 小さい進歩を使う時や、代官・家庭教師で得点するときに、このカードを職業2つに数える。",
            "152" : "152 イチゴ集め アクションで木材を取るたびに、追加で食料1を得る。",
            "155" : "155 パン屋 誰か（自分も含む）がパンを焼くたびに、食料にした小麦1つにつき食料1を得る。",
            "156" : "156 ブラシ作り 食料にした猪をこのカードの上に置くことが出来る。ゲーム終了時にここの猪が2/3/4頭ならば、それぞれ1/2/3点のボーナスを得る。",
            "157" : "157 屋根がけ 増築・改築・水車・木骨の小屋・鶏小屋・別荘・ヴィラ・乾燥小屋の建設で葦を1つ安くできる。",
            "158" : "158 旋盤職人 いつでも木材を食料にできる。木材1につき食料1。",
            "161" : "161 漁師 漁のアクションのたびにそこに置いてある食料の2倍を得る。ただし釣竿・いかだ・カヌー・梁・柄付き網の所有者がいたらそれぞれ食料1ずつ与える。",
            "165" : "165 自由農夫 ゲーム終了時に、未使用の農場スペースと物乞いだけがマイナス点になる。",
            "168" : "168 八百屋 「小麦1を取る」のアクションのたびに追加で野菜1を得る。",
            "170" : "170 大農場管理人 ゲーム終了時に3種類の家畜の合計で自分より多い人がいなければ、3/4/5人プレイでそれぞれ2/3/4点ボーナスを得る。",
            "177" : "177 木大工 ゲーム終了時に、木の部屋1部屋につきボーナス1点を得る。",
            "182" : "182 炭焼き 自分か他の人がパンを焼く進歩（パン○）を行うたびに食料1と木材1を得る。（パンが焼かれる度ではなく、該当する進歩カードが場に出た瞬間）",
            "197" : "197 ほら吹き ゲーム終了時に、自分の前にある進歩カード5/6/7/8/9枚に対して、それぞれ1/3/5/7/9点ボーナスを得る。",
            "198" : "198 ネズミ捕り ラウンド10・12に他の人は全員、新しい家族のうち1人を置くことが出来ない。このカードは9ラウンド終了時までにしか出せない。（「新しい家族」とは3-5番目の家族の事を指す）",
            "205" : "205 葦集め これ以降の4ラウンドのスペースに葦を1つずつ置く。これらのラウンドのはじめにその葦を得る。",
            "209" : "209 石持ち いつでも石材を食料にできる。石材1につき食料2。",
            "211" : "211 石切り 大小の進歩・増築・改築全部が石材1安くなる。",
            "214" : "214 陶工 収穫で、毎回レンガ最大1を食料2にできる。",
            "217" : "217 代官 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に職業を一番多く持っている人は全員3点ボーナスを得る。",
            "341" : "341 ギルド長 家具製作所か家具職人を出すとすぐ木材4を得る。製陶所か陶工を出すとすぐレンガ4を得る。かご製作所かかご編みを出すとすぐ葦3を得る。ギルド長を出したとき、これらのカードをすでに出していれば対応する資材を2つ得る。",
            "149" : "149 パン焼き長老 自分がパン○のついた設備を持っていれば、他の人がパンを焼くたびパンを焼ける。自分で焼くときは追加で食料1を得る。",
            "159" : "159 家長 「増築」と「家族を増やす」が含まれるアクションを、他の人がすでに選んでいても行える。",
            "160" : "160 農場主 次に柵を作るとき、猪1を得る。それ以降、柵を1本以上作るたびに牛1を得る。",
            "163" : "163 畑守 「野菜1を取る」「畑1を耕す」「畑1を耕し種をまく」のアクションを、他の人がすでに選んでいてもそのアクションスペースを使って行える。",
            "164" : "164 営林士 3人ゲームから「木材2」のアクションカードを追加する。各ラウンドのはじめに木材2をその上に置く。この森を使う人から食料2をもらう。",
            "166" : "166 庭職人 「日雇い労働者」のアクションのたびに、追加で野菜1を得る。",
            "167" : "167 奇術師 「小劇場」のアクションのたびに、追加で小麦1を得る。",
            "169" : "169 昔語り 「小劇場」のアクションのたびに食料1をそのスペースに残して、代わりに野菜1を得る。",
            "178" : "178 小屋大工 ラウンド1-4に出せば、第11ラウンドのはじめに無料で1スペース増築できる。（石の家を除く）",
            "180" : "180 小さい庭師 このカードを出したときに野菜1を得る。さらに空いている畑があればこの野菜を植えることができる。",
            "181" : "181 コック 収穫で食糧供給フェイズのたびに、食糧2を食べる家族は2人だけになり、残りの家族は全員食料1で満足する。",
            "183" : "183 かご編み 収穫のたび、葦1（最大１つまで）を食料3にできる。",
            "185" : "185 レンガ焼き いつでもレンガを石材にできる。レンガ2につき石材1、レンガ3につき石材2に換える。",
            "186" : "186 レンガ屋 いつでもレンガ2を羊1か葦1に、レンガ3を猪1か石材1に、レンガ4を牛1にできる。",
            "192" : "192 パトロン これ以降職業を出すたびに、食料2を得る。この食料は今出した職業のコストの支払いに当てても良い。",
            "193" : "193 牧師 このカードを出したときか、それ以降に、家の広さが2部屋しかないのが自分だけである場合、1度だけ木材3・レンガ2・葦1・石材1を得る。",
            "201" : "201 牛使い 現在のラウンドに5と9を足す。そのラウンドのスペースにそれぞれ牛を1つずつ置き、そのラウンドのはじめにその牛を得る。",
            "203" : "203 羊飼い 収穫で繁殖フェイズのたびに、羊4頭以上あれば、子羊1頭ではなく2頭得る。ただし子羊のための場所が必要。",
            "204" : "204 羊飼い親方 これ以降の3ラウンドのスペースにそれぞれ羊1を置く。これらのラウンドのはじめにその羊を得る。",
            "206" : "206 ブタ飼い 「猪1」のアクションのたびに、猪をもう1頭得る。",
            "212" : "212 踊り手 「小劇場」のアクションのたびに、食料が1-3しか置いてなくても食料4を得る。",
            "213" : "213 家畜の世話人 2つ目の厩を建てると牛1、3つ目の厩で猪1、4つ目の厩で羊1を得る。（1度にいくつも建てた場合、その分だけ家畜を得る）",
            "215" : "215 家畜小作人 羊、豚、牛を各1頭ずつすぐにストックから借りる。得点計算の前に各1頭ずつ返す。返さなかった家畜1頭につき1点を失う。",
            "216" : "216 家畜守 同じ牧場の中に羊・猪・牛を飼える。自分の牧場全てに適用する。（ただし森の牧場を除く）",
            "154" : "154 醸造師 収穫で食糧供給フェイズのたびに、小麦1（最大1つまで）を食料3にできる。",
            "219" : "219 畑農 種をまくときに畑を1つだけにすると、その畑に小麦か野菜を追加で2つ置く。畑を2つにすると、小麦か野菜を追加で1つ置く。",
            "220" : "220 井戸掘り 「井戸」は大きな進歩ではなく小さな進歩になり石材1と木材1だけで作ることができる。",
            "225" : "225 畑番 「小麦1を取る」のアクションのたびに追加で畑を最大1つ耕せる。",
            "226" : "226 庭師 野菜畑から収穫するたびに、野菜を畑からではなくストックから取る。畑の野菜はそのままにしておく。",
            "227" : "227 共同体長 残りラウンド数が1/3/6/9ならば、すぐに木材1/2/3/4を得る。ラウンド14で5人以上の家族をアクションに使った人は全員、ゲーム終了時にボーナス3点を得る。（ゲスト、葦の家の住人も数える）",
            "231" : "231 召使 石の家に住んだら、すぐこれ以降のラウンドスペース全てに食料を3つずつ置く。これらのラウンドのはじめにその食料を得る。（カードを出したときすでに石の家に住んでいたらすぐ食料を並べる）",
            "233" : "233 農場管理 レンガか石の家に住み次第、次に増やす家族1人は部屋がいらなくなる。（それ以降の家族は通常通り）",
            "235" : "235 木材集め これ以降の5ラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。",
            "238" : "238 収入役 ラウンド11から、自分だけそれ以降のラウンドで使うラウンドカードのアクションも選べる。これらのカードは早くともラウンド11のはじめから表にしてボード上に置かれる。",
            "241" : "241 レンガ積み 木の家をレンガの家に改築するコストはレンガ1と葦1でよい。またレンガの家の増築は1部屋につきレンガ3と葦2になる。",
            "242" : "242 レンガ大工 レンガの家に住んだらすぐにこれ以降の5ラウンドのスペースにレンガを2つずつ置く。これらのラウンドのはじめにそのレンガを得る。（カードを出したときすでにレンガや石の家に住んでいたらすぐレンガを並べる）",
            "243" : "243 レンガ貼り 進歩と改築はレンが1つ少なくできる。さらに増築はレンガ2つ少なくできる。",
            "244" : "244 居候 このカードを出した次の収穫を完全にスキップする。",
            "247" : "247 精肉屋 いつでも家畜を以下の割合で食料にできる。羊：1　猪：2　牛：3",
            "248" : "248 網漁師 葦を取るアクションのたび、帰宅フェイズで「漁」のアクションスペースにある食料を全部取る。",
            "256" : "256 石工 収穫のたび、石材1（最大１つまで）を食料3にできる。",
            "262" : "262 水運び 誰かが大きい進歩の「井戸」を作ったら、それ以降のラウンドのスペース全てに1つずつ食料を置く。それらのラウンドの最初にその食料を得る。（すでに井戸ができていたらすぐに食料を並べる）",
            "263" : "263 柵立て このカードを出したら自分の柵を1本好きなアクションに置く。自分がそのアクションを選ぶたび、追加で柵を置くアクションもできる。",
            "265" : "265 柵運び 現在のラウンドに6と10を足す。そのラウンドのスペースそれぞれに自分の柵を4本ずつ置き、ラウンドのはじめに食料2を払って4本全部を立てることができる。（木材は払わなくて良い）",
            "221" : "221 村の長老 カードを出した時点で残りラウンド数が1/3/6/9ラウンドならばすぐに、それぞれ木材1/2/3/4を得る。ゲーム終了時に進歩を一番多く出している人は全員3点ボーナスを得る。",
            "223" : "223 収穫手伝い 収穫のたび、食糧供給フェイズのはじめに誰か1人の畑1つから小麦1をとれる。相手は代わりに食料2をストックからとれる。",
            "224" : "224 畑作人 他の人が種をまくたびに3人ゲームでは小麦1、それ以外は食料1を得る。",
            "228" : "228 商人 「スタートプレイヤー」のアクションを選ぶたび、小さい進歩の後にもう一度小さい/大きい進歩ができる。",
            "234" : "234 材木買い付け人 他の人がアクションで木材を取るたびに（同意無しに）木材1を食料1（最大1つまで）で買い取れる。",
            "236" : "236 小作人 ゲーム終了時に未使用の土地スペース1つにつき食料1を支払えばマイナス点にならない。",
            "240" : "240 牛の飼育士 「牛1」のアクションのたびに追加で牛1を得る。",
            "245" : "245 てき屋 「小麦1を取る」のアクションのたびに追加で小麦1と野菜1を得ることができる。そのとき他の人は全員、小麦1をストックから得る。",
            "258" : "258 家具職人 収穫のたび、木材最大1を食料2にできる。",
            "259" : "259 家畜追い 「羊1」「猪1」「牛1」のアクションを行うたび、食料1を払って同じ種類の家畜をもう1頭得ることができる。",
            "222" : "222 成り上がり 1番にレンガの家や石の家に改築したらそれぞれ石材3を得る。2番目なら石材2、3番目なら石材1を得る。（カードを出す前に効果は遡らない）",
            "229" : "229 ごますり 「小麦1を取る」のアクションを行う人から前もって食料1をもらう。さらにストックから食料1を得る。自分が得るときもストックから追加で食料1を得る。",
            "230" : "230 穴掘り 3人ゲームから「レンガ1」を追加する。その上にすぐにレンガ3を置き、各ラウンドのはじめにレンガ1をその上に置く。このアクションを使う人から食料3をもらう。",
            "232" : "232 産婆 他の人が家族を増やすたび、その家族が自分より多いとストックから食料1を得る。2人以上多ければ食料2を得る。",
            "237" : "237 旅芸人 「小劇場」のアクションのたびにおいてある食料の2倍を得る。ただし曲芸師・猛獣使い・奇術師・昔語り・人形使い・街頭の音楽家・踊り手・魔術使いがいればそれぞれ食料1ずつ与えなければならない。",
            "239" : "239 脱穀職人 いつでも小麦１を食料3にできる。他の人は食料2を出してその小麦を買取りこの行動を無効にできる。複数名乗り出たら選んでよい。",
            "246" : "246 乳搾り 収穫のたび、畑フェイズで牛1/3/5頭がいれば、それぞれ食料1/2/3を得る。ゲーム終了時に牛2頭につき1点ボーナスを得る。",
            "249" : "249 人形使い 他の人が「小劇場」のアクションを行うたびに食料1を払って職業1を出せる。",
            "250" : "250 羊使い 現在のラウンドに4・7・9・11を足す。そのラウンドにそれぞれ羊を1つずつ置き、ラウンドはじめにその羊を得る。",
            "251" : "251 葦買い付け人 毎ラウンド、最初に葦をとった人に食料最大1を支払い葦1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。",
            "252" : "252 猪飼い 置ける場所があればラウンド12の最後でも猪が繁殖する。このカードを出したらすぐに猪1を得る。",
            "253" : "253 猪猟師 アクションで木材を取るたびに、その中から2つ残して代わりに猪1を得る。",
            "254" : "254 馬手 石の家に住み次第、毎ラウンドのはじめに厩のアクションに家族を置かずに木材1で厩1（最大1つまで）を建てられる。",
            "255" : "255 石買い付け人 毎ラウンド、最初に石材をとった人に食料最大1を支払い石材1を（同意無しに）買い取ることができる。相手はさらにストックから食料1を得る。",
            "257" : "257 街頭の音楽家 他の人が「小劇場」のアクションを行うたびに、小麦1を得る。",
            "260" : "260 毒見役 他の人がスタートプレイヤーのたび、ラウンドのはじめにその人に食料1を払えば最初に家族を1人置ける。その後スタートプレイヤーから通常通りに置く。",
            "261" : "261 乗馬従者 今出たばかりのラウンドカードのアクションを行うたびに追加で小麦1を得る。",
            "264" : "264 柵作り 他の人が柵を1-4本立てるたびストックから木材1を得る。5本以上立てれば木材2を得る。",
            "340" : "340 農夫 毎ラウンドのはじめ（フェイズ1の前）に他の人より農場を多く使用していたら木材1を得る。",
            "267" : "267 養父母 食料1を払えば増やしたばかりの新しい家族でアクションができる。その場合、新しい家族は新生児には含めない。",
            "268" : "268 出来高労働者 アクションで木材・レンガ・葦・石材・小麦のいずれかを手に入れるたびに、食料1で同じものをもう1つ買える。野菜の場合は食料2で買える。",
            "270" : "270 乳母 増築のとき、増築した部屋の数だけすぐに家族を増やせる。家族1人につき食料1を払う。（新生児は次のラウンドになってからアクションに使える。増築した後に部屋のなかった家族がいれば移して、それでもなお空き部屋がある場合のみ有効）",
            "272" : "272 梁打ち 改築でレンガ1や石材1（最大1）を木材1で代用できる。増築ではレンガ2や石材2（最大2）を木材1で代用できる。",
            "274" : "274 有機農業者 ゲーム終了時に、家畜が1頭以上いて、かつまだ3頭以上入れられる牧場1つにつき1点のボーナスを得る。（森の牧場も含む）",
            "278" : "278 林務官 「種をまく」のアクションを行うたびにこのカードの上に木材を3つまで植えられる。小麦畑と同じように扱い、畑フェイズで収穫する。",
            "279" : "279 学者 石の家に住み次第、毎ラウンドのはじめに食料1で職業カードを出すかコストを払って進歩カードを出せる。",
            "281" : "281 行商人 「小さい進歩1」のアクションのたびに、小さい進歩の代わりに大きい進歩ができる。「大きい進歩または小さい進歩1」では小さい進歩を2枚出せる。",
            "283" : "283 木材運び ラウンド8-14のうち、まだ始まっていないラウンドのスペースに木材を1つずつ置く。これらのラウンドのはじめにその木材を得る。",
            "284" : "284 木材配り 毎回ラウンドのはじめに「木材3」にある木材をその下の「レンガ1」「葦1」「漁」のマスに同じ数ずつ分けることができる。このカードを出したときに木材2を得る。このカードの効果で木材が配られたアクションスペースは「木材が累積するスペース」とみなす。",
            "286" : "286 小農夫 家畜2頭分だけの牧場に3頭飼えるようになる。持っている畑が全部で2つ以下なら、種をまくたびに小麦か野菜が1つ増える。",
            "290" : "290 レンガ職人 アクションで木材かレンガを取るたびに、追加でレンガ1を得る。",
            "292" : "292 露天商の女 アクションや小さい進歩で野菜を取るたびに、追加で小麦2を得る。",
            "293" : "293 鋤手 現在のラウンドに4・7・10を足す。そのラウンドのスペースにそれぞれ畑を1つずつ置き、これらのラウンドのはじめに食料1を払えばその畑を自分の農場における。",
            "300" : "300 火酒作り 収穫で食糧供給フェイズのたびに、野菜最大1を食料5にできる。",
            "301" : "301 彫刻家 進歩1・木の家の増築1・厩・柵のいずれかで、1ラウンドに1回、払う木材を1つ少なくできる。",
            "306" : "306 調教師 自分の家のどの部屋にも家畜を1頭ずつ置ける。種類が別でも良い。",
            "312" : "312 柵見張り 毎ラウンド1回だけ、建てた厩1つまでを即座に食料1を払うことで柵で囲み、1スペースの牧場にできる。柵のコストの木材は払わなくて良い。これは未使用スペースが牧場になったものとみなす。",
            "276" : "276 村長 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時にマイナス点がない人は全員5点のボーナスを得る。",
            "277" : "277 工場主 レンガか石の家に住み次第、家具製造所・製陶所・かご製作所は小さい進歩になり好きな資源2つ少なく作ることが出来る。",
            "280" : "280 革なめし工 食料にした猪と牛をこのカードの上に置く。ゲーム終了時に畜殺した猪が2/4/6頭または牛が2/3/4頭ならばそれぞれ1/2/3点のボーナスを得る。",
            "282" : "282 執事 カードを出した時点で残りラウンド数が1/3/6/9ならば、それぞれ木材1/2/3/4を得る。ゲーム終了時に家が一番広い人は全員3点のボーナスを得る。",
            "285" : "285 ブリキ職人 いつでもレンガを食料にできる。レンガ1につき食料1。誰かが井戸を作ればレンガ2につき食料3にできる。（村の井戸でも可）",
            "291" : "291 愛人 このカードを出したらすぐ「家族を増やす（部屋がなくてもよい）」のアクションを行う。このカードを出すのにコストとして追加で食料4が必要。",
            "294" : "294 柴結び 改築と増築で必要な葦を木材1で代用できる。",
            "296" : "296 種屋 「小麦1を取る」のアクションで追加で小麦1を取る。このカードを出したとき小麦1を得る。",
            "297" : "297 羊番 石の家に住み次第これ以降のラウンドのスペースに羊を1頭ずつ置く。これらのラウンドのはじめにその羊を得る。（カードを出したときすでに石の家ならばすぐに羊を置く）",
            "299" : "299 畜殺人 他の人が家畜を食料にするたびに、（食料にした頭数にかかわらず）食料1をストックから得る。食糧供給フェイズでは手番を最後に行う。",
            "266" : "266 畑好き 「種をまいてパンを焼く」のアクションのたびにアクションの前に小麦1を得る。あるいは手持ちの小麦1を野菜1と交換できる。",
            "269" : "269 曲芸師 「小劇場」のアクションのたび、他の人全員が家族を置き終わったあとで、小劇場に置いた家族を「畑1を耕す」か「小麦1を取る」か「畑1を耕して種をまく」のアクションのいずれかに（空いていれば）移動してそのアクションを行うことができる。",
            "271" : "271 職業訓練士 他の人が職業を出すたびに、食料3を払えば自分も職業1を出せる。4枚目以降の職業は食料2だけでよい。",
            "273" : "273 骨細工 食料にした猪1頭につき自分の木材2までをこのカードの上に置ける。1･4･7･10番目の木材を除きこのカードの上にある木材1につき1点のボーナスを得る。",
            "275" : "275 ぶらつき学生 職業を出すときに、職業カードの手札から誰かに引いてもらって出すことができる。そのたびに食料3を受け取り、その職業を出すのに払ってもよい。",
            "287" : "287 倉庫主 ラウンドのはじめに石材5以上持っていれば石材1、葦6以上で葦1、レンガ7以上でレンガ1、木材8以上で木材1を得る。",
            "288" : "288 倉庫番 1つのアクションで葦と石材の両方を取るたびに、追加でレンガ1か小麦1を得る。",
            "289" : "289 営農家 全員が家族を置いた後、「小麦1を取る」か「野菜1を取る」に家族を置いていれば、「種をまく」か「種をまいてパンを焼く」のアクションのどちらかに（空いていれば）移動してそのアクションを行うことが出来る。",
            "295" : "295 牛飼い 場所があればラウンド12の後にも牛が繁殖する。このカードを出したらすぐ牛1を得る。",
            "298" : "298 羊農 アクションで羊を取るたびに、追加で羊1をストックから得る。いつでも（繁殖フェイズを除く）羊3を牛1と猪1に交換できる。",
            "302" : "302 猪使い 現在のラウンドに4･7･10を足す。そのラウンドのスペースにそれぞれ猪1ずつ置き、ラウンドのはじめにその猪を得る。",
            "303" : "303 石打ち 「改築」のアクションなしで、いつでもレンガの家を石の家に改築できる。（ただし資材は払う）",
            "304" : "304 獣医 このカードを出したとき白いマーカー4、黒いマーカー3、茶色のマーカー2を取って袋の中に入れる。各ラウンドのはじめに2つ引く。同じなら1つを袋に戻して、同じ色の家畜を1頭得る。同じでなければ2つとも袋に戻す。",
            "305" : "305 家畜主 まだ始まっていなければラウンド7に羊1、ラウンド10に猪1、ラウンド14に牛1を置く。これらのラウンドのはじめに食料1でその家畜を買える。",
            "307" : "307 家畜飼い 未使用の土地から新しい牧場を作るたびに、以下のコストで家畜のつがいを1組買える。羊2頭は食料1、猪2頭は食料2、牛2頭は食料3。",
            "308" : "308 職場長 毎ラウンド、労働フェイズのはじめに共通のストックから食料1を取り、好きなアクションスペースに置く。",
            "309" : "309 織工 毎ラウンド、労働フェイズのはじめに羊2頭以上持っていれば、食料1を得る。",
            "311" : "311 魔術使い 自分の家族の最後の1人を「小劇場」のアクションに置くたびに、追加で小麦1と食料1を得る。",
            "342" : "342 猛獣使い 「小劇場」で取った食料ですぐに家畜を入手できる。羊1頭につき食料2、猪1頭につき食料2、牛1頭につき食料3。",
            "310" : "310 資材商人 このカードの上に下から石材・レンガ・石材・レンガ・葦・レンガ・木材を1つずつ順番に重ねる。一番上の品と同じものを他で取るたびに、一番上の品も得る。",
        };

        return json;
    }

})(); 