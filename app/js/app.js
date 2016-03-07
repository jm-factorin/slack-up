(function () {
    var code = function() {
        $(document.body).on('click', '[data-action="mention"]', function(e) {
            var $input = $("textarea#message-input");
            if ($input.prop('disabled')) {
                return;
            }

            var $msg = $input.val() + '@' + $(e.target).data('mention');
            $input.val($msg.trim() + ' ').trigger("autosize").trigger("autosize-resize").focus();
        });

        //noinspection JSUnresolvedVariable
        var buildMsgHTML = TS.templates.builders.buildMsgHTML;

        //noinspection JSUnresolvedVariable
        TS.templates.builders.buildMsgHTML = function (O, h) {
            var $html = buildMsgHTML(O, h);
            try {
                var $div = $('<div>').html($html);
                var $url = $div.find('a.message_sender').attr('href');
                var $container = $div.find('div.action_hover_container');
                if ($url) {
                    var $mention = $('<a>')
                        .attr('data-action', 'mention')
                        .attr('data-mention', $url.split('/')[2])
                        .addClass('ts_icon ts_icon_mentions')
                        .addClass('ts_tip ts_tip_top ts_tip_float ts_tip_delay_600 ts_tip_hidden')
                        .append($('<span>').addClass('ts_tip_tip').html('Mention'));
                    $container.prepend($mention);
                }

                return $div.html();
            } catch (e) {
                console.error(e);
                return $html;
            }
        };

        //noinspection JSUnresolvedVariable
        var memberTemplate = TS.templates.member;

        //noinspection JSUnresolvedVariable
        TS.templates.member = function (a) {
            var html = memberTemplate(a);
            var $div = $('<div>').html(html);
            var $img = $('<img>');

            $img.css('display', 'inline-block');
            $img.css('margin', '0 0 5px 5px');
            $img.css('border-radius', '3px');
            $img.css('height', '20px');
            $img.css('width', '20px');

            var span = $div.find('span.presence')[0];
            var bot = $div.find('i.slackbot_icon')[0];

            if (bot) {
                $img.attr('src', 'https://slack.global.ssl.fastly.net/66f9/img/slackbot_24.png');
                $img.insertAfter($(bot));
            } else {
                //noinspection JSUnresolvedVariable,JSUnresolvedFunction
                var user = TS.members.getMemberById($(span).data('member-presence'));

                //noinspection JSUnresolvedVariable
                $img.attr('src', user.profile.image_24);
                $img.insertAfter($(span));
            }

            return $div.html();
        };
    };

    //append to document body
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = '(' + code.toString() + ')();';
    document.body.appendChild(script);
})();