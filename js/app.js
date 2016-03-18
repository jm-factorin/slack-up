(function () {
    var code = function () {
        var HIDDEN_MESSAGE_KEY = 'conf_hide_msg_ids';
        var SLACKBOT_ICON_URL = 'https://slack.global.ssl.fastly.net/66f9/img/slackbot_24.png';

        function _sortChannelList($ul) {
            var $li = $('li', $ul);
            $li.sort(function (a, b) {
                function getChannelName(c) {
                    var $channel = $(c).find('span.overflow_ellipsis')
                        .first().clone().text().trim().replace(/\r?\n/g, '');
                    if ($channel.substring(0, 1) == '#') {
                        $channel = $channel.substring(1).trim();
                    }

                    return $channel;
                }

                return getChannelName(a).localeCompare(getChannelName(b));
            });

            $ul.empty();
            $li.each(function (k, v) {
                $ul.append(v);
            });
        }

        function _rebuildClientPage() {
            TS.client.channel_pane.rebuildImList();
            TS.client.channel_pane.rebuildGroupList();
            TS.client.channel_pane.rebuildStarredList();
            TS.client.channel_pane.rebuildChannelList();
        }

        function _injectChangeInfo(html) {
            var $div = $('<div>').html(html);
            var $li = $('<li>', {id: "channel_info_change"}).html('<a>Set Channel Info</a>');

            $li.insertAfter($div.find('li.divider').first());
            return $div.html();
        }

        function _renderSidebarName(html, type) {
            var $div = $('<div>').html(html);
            var $name = $div.find('a.' + type + '_name').attr('href');
            var $id = $div.find('a.' + type + '_name').data(type + '-id');
            var icon = (type == 'group') ? 'ts_icon_lock' : 'ts_icon_channel_pane_hash';

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
                        $prefix = $('<ts-icon>').attr('class', icon + ' prefix');
                    }
                } catch (e) {
                    $prefix = $('<ts-icon>').attr('class', icon + ' prefix');
                }

                if (type == 'group') {
                    $div.find('ts-icon').first().remove();
                }

                var $ch = data.alias ? data.alias : $name.split('/')[2];
                $ellipsis.prepend($prefix);
                $ellipsis.append($ch);
                return $div.html();
            } catch (e) {
                console.error(e);
                return html;
            }
        }

        var ChangeIconDialog = {
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
                    + '<div class="modal-body"><p class="top_margin">'
                    + '<label for="ch_alias" class="inline_block">Sidebar Alias</label>'
                    + '<input id="ch_alias" type="text" class="small">'
                    + '<span class="modal_input_note">Add channel alias. '
                    + 'Set a custom sidebar name for this channel.</span>'
                    + '</p><p class="top_margin">'
                    + '<label for="ch_icon" class="inline_block">Emoji Icon</label>'
                    + '<input id="ch_icon" type="text" class="small">'
                    + '<span class="modal_input_note">Change channel emoji icon. '
                    + 'Paste your emoji code here like <code>:book:</code></span>'
                    + '</p></div>'
                    + '<div class="modal-footer"><a class="btn btn_save">Save Settings</a></div>';
            },

            show: function (title) {
                var $div = $('div#change_icon_dialog');
                if (!$div.length) {
                    $div = $('<div>', {
                        "id": "change_icon_dialog",
                        "class": "modal hide fade in",
                        "aria-hidden": "false"
                    }).html(ChangeIconDialog.html());
                    $(document.body).append($div);
                }

                var data = ChangeIconDialog.getData(TS.model.active_cid);
                $div.find('#ch_icon').val(data.icon);
                $div.find('#ch_alias').val($('<span>').html(data.alias).text());
                $div.find('span#ch_title').text(title);
                $div.find('a.btn_save').click(function (e) {
                    e.preventDefault();
                    window.localStorage.setItem(ChangeIconDialog.getChannelKey(TS.model.active_cid), JSON.stringify({
                        'icon': TS.utility.htmlEntities($('#ch_icon').val().trim()),
                        'alias': TS.utility.htmlEntities($('#ch_alias').val().trim())
                    }));

                    _rebuildClientPage();
                    $div.modal('hide');
                });
                $div.modal('show');
            }
        };

        var _rebuildStarredList = TS.client.channel_pane.rebuildStarredList;
        TS.client.channel_pane.rebuildStarredList = function () {
            _rebuildStarredList();
            _sortChannelList($('ul#starred-list'));
        };

        var _rebuildChannelList = TS.client.channel_pane.rebuildChannelList;
        TS.client.channel_pane.rebuildChannelList = function () {
            _rebuildChannelList();
            _sortChannelList($('ul#channel-list'));
        };

        var _rebuildMsgs = TS.client.msg_pane.rebuildMsgs;
        TS.client.msg_pane.rebuildMsgs = function () {
            _rebuildMsgs();
            var $containers = $('div.day_container');
            if (!$containers.length) {
                return;
            }

            $containers.each(function (k, v) {
                var $div = $(v);
                var $day_msgs = $div.find('div.day_msgs');
                if (!$day_msgs.length || $day_msgs.first().html() == '') {
                    $div.remove();
                }
            });
        }

        var _menuChannelItems = TS.templates.menu_channel_items;
        TS.templates.menu_channel_items = function (a) {
            return _injectChangeInfo(_menuChannelItems(a))
        };

        var _menuGroupItems = TS.templates.menu_group_items;
        TS.templates.menu_group_items = function (a) {
            return _injectChangeInfo(_menuGroupItems(a))
        };

        var _menuMessageActionItems = TS.templates.menu_message_action_items;
        TS.templates.menu_message_action_items = function (a) {
            var $div = $('<div>').html(_menuMessageActionItems(a));
            var $li = $('<li>', {
                "id" : "hide_link",
                "class": "danger",
                "data-ts-message-id": TS.templates.makeMsgDomId(a.msg.ts)
            }).html('<a>Hide message</a>');

            if (!$div.find('li.divider').length) {
                $div.append($('<li>', {"class": "divider"}));
            }

            $div.append($li);
            return $div.html();
        };

        var _memberTemplate = TS.templates.member;
        TS.templates.member = function (a) {
            var html = _memberTemplate(a);
            var $div = $('<div>').html(html);
            var $img = $('<img>');

            $img.attr('src', a.member.profile.image_24);
            $img.css('display', 'inline-block');
            $img.css('margin', '0 0 5px 5px');
            $img.css('border-radius', '3px');
            $img.css('height', '20px');
            $img.css('width', '20px');

            var $bot = $div.find('i.slackbot_icon');
            if ($bot.length) {
                $img.insertAfter($($bot));
            } else {
                $img.insertAfter($div.find('span.presence').first());
            }

            return $div.html();
        };

        var _channelTemplate = TS.templates.channel;
        TS.templates.channel = function (a) {
            var html = _channelTemplate(a);
            return _renderSidebarName(html, 'channel');
        };

        var _groupTemplate = TS.templates.group;
        TS.templates.group = function (a) {
            var html = _groupTemplate(a);
            return _renderSidebarName(html, 'group');
        };

        var _messageTemplates = TS.templates.message;
        TS.templates.message = function (a) {
            var html = _messageTemplates(a);
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
            ChangeIconDialog.show(TS.shared.getActiveModelOb().name);
            TS.menu.end();
        });

        $(document.body).on('click', '[id="hide_link"]', function (e) {
            var $id = $(this).data('ts-message-id');
            var data = JSON.parse(window.localStorage.getItem(HIDDEN_MESSAGE_KEY));
            data = data ? data : {};
            data[$id] = true;

            window.localStorage.setItem(HIDDEN_MESSAGE_KEY, JSON.stringify(data));
            TS.client.msg_pane.rebuildMsgs();
        });

        _rebuildClientPage();
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = '(' + code.toString() + ')();';
    document.body.appendChild(script);
})();