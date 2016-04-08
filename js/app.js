(function () {
    var code = function () {
        var HIDDEN_MESSAGE_KEY = 'conf_hide_msg_ids';
        var CONF_PREFIX = 'conf_sidebar_';

        function _sort(a, b) {
            function getChannelName(c) {
                var $channel = $(c).find('span.overflow_ellipsis')
                    .first().clone().text().trim().replace(/\r?\n/g, '');
                if ($channel.substring(0, 1) == '#') {
                    $channel = $channel.substring(1).trim();
                }

                return $channel;
            }

            return getChannelName(a).localeCompare(getChannelName(b));
        }

        function _sortChannelList($ul) {
            var $li = $('li', $ul);
            $li.sort(_sort);

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

        function _getConfData(id) {
            var json = window.localStorage.getItem(CONF_PREFIX + id);
            return json ? JSON.parse(json) : {"icon": "", "alias": ""};
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
                var data = _getConfData($id);
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

        function _getChannelConfSettings() {
            var json = {};
            var keys = Object.keys(window.localStorage);
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (k.indexOf(CONF_PREFIX) == 0) {
                    json[k] = JSON.parse(window.localStorage[k]);
                }
            }

            return json;
        }

        function _downloadConfigFile() {
            var data = JSON.stringify(_getChannelConfSettings());
            var blob = new Blob([data]);
            var e = document.createEvent("HTMLEvents");
            e.initEvent("click");
            $("<a>", {
                download: 'slack-up.' + TS.model.team.domain + '.config.json',
                href: URL.createObjectURL(blob)
            }).get(0).dispatchEvent(e);
        }

        function _uploadConfigFile(e) {
            try {
                var file = e.target.files[0];
                if (file != null) {
                    var reader = new FileReader();
                    reader.addEventListener('load', function(evt) {
                        var conf = JSON.parse(evt.target.result);
                        var keys = Object.keys(conf);
                        for (var i = 0; i < keys.length; i++) {
                            var key = keys[i];
                            if (key.indexOf(CONF_PREFIX) == 0) {
                                window.localStorage.setItem(key, JSON.stringify({
                                    'icon': conf[key].icon,
                                    'alias': conf[key].alias
                                }));
                            }
                        }

                        _rebuildClientPage();
                        TS.ui.inline_saver.show({target: TS.generic_dialog.div.find('a#upload_conf_btn')});
                    });
                    reader.readAsText(file);
                }
            } catch (ex) {
                console.error(ex);
            }
        }

        function _buildImportExportDialog() {
            return '<p class="bold no_bottom_margin">'
                + '<a id="download_conf_btn" class="bold">Export channel configuration file</a></p>'
                + '<p style="line-height:1.25rem;">Download all your channel settings to a json file. '
                + 'You can share this to others to sync their settings with yours.</p>'
                + '<p class="bold no_bottom_margin"><a id="upload_conf_btn" class="bold">'
                + 'Import channel setting json file</a></p>'
                + '<input type="file" style="display:none" id="import_json" accept=".json" />'
                + '<p style="line-height: 1.25rem;margin-bottom:0">'
                + 'Upload <code>json</code> file and automatically update your channel aliases and icons</p>';
        }

        function _buildChangeChannelInfoDialog() {
            return '<p class="top_margin">'
                + '<label for="ch_alias" class="inline_block">Sidebar Alias</label>'
                + '<input id="ch_alias" type="text" class="small">'
                + '<span class="modal_input_note">Add channel alias. '
                + 'Set a custom sidebar name for this channel.</span>'
                + '</p><p class="top_margin">'
                + '<label for="ch_icon" class="inline_block">Emoji Icon</label>'
                + '<input id="ch_icon" type="text" class="small">'
                + '<span class="modal_input_note" id="ch_info_save_target">Change channel emoji icon. '
                + 'Paste your emoji code here like <code>:book:</code></span></p>';
        }

        function _showImportExportModalDialog() {
            TS.generic_dialog.start({
                title: "SlackUp Preferences",
                body: _buildImportExportDialog(),
                show_cancel_button: true,
                show_go_button: false,
                esc_for_ok: false,
                onShow: function () {
                    TS.generic_dialog.div
                        .find(".modal-footer")
                        .addClass("hidden");
                }
            });

            TS.generic_dialog.div
                .find('.modal-body input#import_json')
                .change(_uploadConfigFile);
        }

        function _showChangeChannelInfoDialog() {
            TS.generic_dialog.start({
                title: "Set info for channel #" + TS.shared.getActiveModelOb().name,
                body: _buildChangeChannelInfoDialog(),
                show_cancel_button: true,
                show_go_button: true,
                go_button_text: "Save Settings",
                esc_for_ok: false,
                onShow: function () {
                    var $div = TS.generic_dialog.div;
                    var data = _getConfData(TS.model.active_cid);

                    $div.find('#ch_alias').val($('<span>').html(data.alias).text());
                    $div.find('#ch_icon').val(data.icon);
                },
                onGo: function() {
                    var $div = TS.generic_dialog.div;
                    var $icon = $div.find('#ch_icon').val().trim();
                    var $alias = $div.find('#ch_alias').val().trim();

                    window.localStorage.setItem(CONF_PREFIX + TS.model.active_cid, JSON.stringify({
                        'icon': TS.utility.htmlEntities($icon),
                        'alias': TS.utility.htmlEntities($alias)
                    }));

                    _rebuildClientPage();
                }
            });

        }

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
                "id": "hide_link",
                "class": "danger",
                "data-ts-message-id": TS.templates.makeMsgDomId(a.msg.ts)
            }).html('<a>Hide message (for me)</a>');

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

        var _channelHeaderTemplates = TS.templates.channel_header;
        TS.templates.channel_header = function (a) {
            var $div = $('<div>').html(_channelHeaderTemplates(a));
            if (boot_data.hasOwnProperty('other_accounts') && Object.keys(boot_data.other_accounts).length) {
                var $container = $('<div>', {"class": "team_list_info", "style": "background:#FFF"});
                var keys = Object.keys(boot_data.other_accounts);
                keys.forEach(function (k) {
                    var html = '<a class="blue_hover channel_actions_toggle channel_header_icon ts_tip ts_tip_bottom"'
                        + ' href="' + boot_data.other_accounts[k]['team_url'] + '" target="_blank">'
                        + '<span class="ts_tip_tip">' + boot_data.other_accounts[k]['team_name'] + '</span>'
                        + '<img style="border-radius:3px;width:24px;height:24px;margin:4px 3px 0 0"'
                        + ' src="' + boot_data.other_accounts[k]["team_icon"]["image_34"] + '"></a>';

                    $container.append(html);
                });

                $container.append('<div class="divider_bar">');
                $div.append($container);
            }
            return $div.html();
        };

        var _menuStartWithTeamAndUser = TS.menu.startWithTeamAndUser;
        TS.menu.startWithTeamAndUser = function (e) {
            _menuStartWithTeamAndUser(e);
            var $ul = $('section.slack_menu_you ul.menu_list');
            var $li = $('<li>', {"id": "import_export_dialog", "role": "menuitem"});
            var $a = $('<a>');

            $a.html('SlackUp Preferences');
            $li.append($a);
            $ul.append($li);
        };

        $(document.body).on('click', '[id="channel_info_change"]', function (e) {
            e.preventDefault();
            TS.menu.end();
            _showChangeChannelInfoDialog();
        });

        $(document.body).on('click', '[id="hide_link"]', function (e) {
            var $id = $(this).data('ts-message-id');
            var data = JSON.parse(window.localStorage.getItem(HIDDEN_MESSAGE_KEY));
            data = data ? data : {};
            data[$id] = true;

            window.localStorage.setItem(HIDDEN_MESSAGE_KEY, JSON.stringify(data));
            TS.client.msg_pane.rebuildMsgs();
        });

        $(document.body).on('click', '[id="import_export_dialog"]', function (e) {
            e.preventDefault();
            clearTimeout(TS.menu.end_time);
            TS.menu.end();
            _showImportExportModalDialog();
        });

        $(document.body).on('click', '[id="download_conf_btn"]', function (e) {
            e.preventDefault();
            _downloadConfigFile();
        });

        $(document.body).on('click', '[id="upload_conf_btn"]', function (e) {
            e.preventDefault();
            $('input#import_json').trigger('click');
        });

        _rebuildClientPage();
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = '(' + code.toString() + ')();';
    document.body.appendChild(script);
})();