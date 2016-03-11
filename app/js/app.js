(function () {
    var code = function () {
        var HIDDEN_MESSAGE_KEY = 'conf_hide_msg_ids';

        function channelPageRebuild() {
            TS.client.channel_pane.rebuildStarredList();
            TS.client.channel_pane.rebuildChannelList();
            TS.client.channel_pane.rebuildGroupList();
            TS.client.channel_pane.rebuildImList();
            TS.client.channel_pane.rebuildPublicPrivateChannelsList();
        }

        var ChangeIconDialog = {
            escape: function (str) {
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            },

            getData: function (id) {
                var json = window.localStorage.getItem(ChangeIconDialog.getChannelKey(id));
                return json ? JSON.parse(json) : {"icon": "", "alias": ""};
            },

            getChannelKey: function (id) {
                return 'conf_sidebar_' + id;
            },

            html: function () {
                return '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" '
                    + 'aria-hidden="true">×</button><h3>Set info for channel #<span id="ch_title"></span></h3></div>'
                    + '<div class="modal-body"><p>Change channel emoji icon. Paste your emoji name here like '
                    + '<code>:book:</code></p><input type="text" id="ch_icon" value="" class="with-emoji-menu"'
                    + ' style="display:inline-block; width: 100%"/>'
                    + '<p style="margin-top: 20px">Add channel alias. Set a custom sidebar name for this channel</p>'
                    + '<input type="text" id="ch_alias" value="" style="display:inline-block; width: 100%"/>'
                    + '</p></div><div class="modal-footer"><a class="btn btn_save">Save</a></div>';
            },

            show: function (title) {
                var $div = $('div#change_icon_dialog');
                if (!$div.length) {
                    $div = $('<div>', {
                            "id": "change_icon_dialog",
                            "class": "modal hide fade in",
                            "aria-hidden": "false"
                        }
                    ).html(ChangeIconDialog.html());
                    $(document.body).append($div);
                }

                var data = ChangeIconDialog.getData(TS.model.active_cid);
                $div.find('#ch_icon').val(data.icon);
                $div.find('#ch_alias').val($('<span>').html(data.alias).text());
                $div.find('span#ch_title').text(title);
                $div.find('span.ch_preview').click(function (e) {
                    TS.emoji_menu.startEmo(e, "#ch_icon")
                });
                $div.find('a.btn_save').click(function (e) {
                    e.preventDefault();
                    window.localStorage.setItem(ChangeIconDialog.getChannelKey(TS.model.active_cid), JSON.stringify({
                        'icon': ChangeIconDialog.escape($('#ch_icon').val().trim()),
                        'alias': ChangeIconDialog.escape($('#ch_alias').val().trim())
                    }));

                    channelPageRebuild();
                    $div.modal("hide");
                });
                $div.modal("show");
            }
        };


        var menuChannelItems = TS.templates.menu_channel_items;
        TS.templates.menu_channel_items = function (a) {
            var $div = $('<div>').html(menuChannelItems(a));
            var $li = $('<li>', {id: "channel_info_change"}).html('<a>Set Channel Info</a>');

            $li.insertAfter($div.find('li.divider').first());
            return $div.html();
        };

        //noinspection JSUnresolvedVariable
        var buildMsgHTML = TS.templates.builders.buildMsgHTML;

        //noinspection JSUnresolvedVariable
        TS.templates.builders.buildMsgHTML = function (O, h) {
            var $html = buildMsgHTML(O, h);
            try {
                var $div = $('<div>').html($html);
                var $msg_id = $div.find('ts-message').first().attr('id');
                var $url = $div.find('a.message_sender').attr('href');
                var $container = $div.find('div.action_hover_container');
                if ($url) {
                    var $mention = $('<a>')
                        .attr('data-action', 'mention')
                        .attr('data-user', $url.split('/')[2])
                        .addClass('ts_icon ts_icon_mentions')
                        .addClass('ts_tip ts_tip_top ts_tip_float ts_tip_delay_600 ts_tip_hidden')
                        .append($('<span>').addClass('ts_tip_tip').html('Mention'));
                    $container.prepend($mention);
                }

                var $hide = $('<a>')
                    .attr('data-action', 'hide')
                    .attr('data-ts-message-id', $msg_id)
                    .addClass('ts_icon ts_icon_archive')
                    .addClass('ts_tip ts_tip_top ts_tip_float ts_tip_delay_600 ts_tip_hidden')
                    .append($('<span>').addClass('ts_tip_tip').html('Hide'));
                $hide.insertAfter($container.find('a[data-action="copy_link"]'));

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

        var channelTemplate = TS.templates.channel;
        TS.templates.channel = function (a) {

            var html = channelTemplate(a);
            var $div = $('<div>').html(html);
            var $id = $div.find('a.channel_name').data('channel-id');
            var $name = $div.find('a.channel_name').attr('href');

            try {
                var data = ChangeIconDialog.getData($id);

                if (!data.icon && !data.alias) {
                    return html;
                }

                var $ellipsis = $div.find('span.overflow_ellipsis');
                $ellipsis.empty();

                try {
                    var $prefix = $(TS.emoji.graphicReplace(data.icon, {force_img: true}));
                    if ($prefix.attr('src')) {
                        $prefix.css('margin', '-2px 3px 0 ');
                    } else {
                        $prefix = $('<span class="prefix"># </span>');
                    }
                } catch (e) {
                    $prefix = $('<span class="prefix"># </span>');
                }


                var $ch = data.alias ? data.alias : $name.split('/')[2];
                $ellipsis.prepend($prefix);
                $ellipsis.append($ch);
                return $div.html();
            } catch (e) {
                console.error(e);
                return html;
            }
        };

        var messageTemplates = TS.templates.message;
        TS.templates.message = function (a) {
            var html = messageTemplates(a);
            var $div = $('<div>').html(html);
            var $id = $div.find('ts-message').first().attr('id');
            var msg_ids = JSON.parse(window.localStorage.getItem(HIDDEN_MESSAGE_KEY));
            if (msg_ids && msg_ids.hasOwnProperty($id) && msg_ids[$id]) {
                return '';
            }

            return html;
        };

        $(document.body).on('click', '[id="channel_info_change"]', function (e) {
            e.preventDefault();
            ChangeIconDialog.show(TS.menu.channel.name);
            TS.menu.end();
        });

        $(document.body).on('click', '[data-action="mention"]', function (e) {
            var $input = $("textarea#message-input");
            if ($input.prop('disabled')) {
                return;
            }

            var $msg = $input.val() + '@' + $(e.target).data('user');
            $input.val($msg.trim() + ' ')
                .trigger("autosize")
                .trigger("autosize-resize")
                .focus();
        });

        $(document.body).on('click', '[data-action="hide"]', function (e) {
            var $id = $(e.target).data('ts-message-id');

            var data = JSON.parse(window.localStorage.getItem(HIDDEN_MESSAGE_KEY));
            data = data ? data : {};
            data[$id] = true;

            window.localStorage.setItem(HIDDEN_MESSAGE_KEY, JSON.stringify(data));
            TS.client.msg_pane.rebuildMsgs();
        });

        channelPageRebuild();
    };

    //append to document body
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = '(' + code.toString() + ')();';
    document.body.appendChild(script);
})();