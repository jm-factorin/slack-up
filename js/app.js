(function () {
    var code = function () {
        var excludedConsoleMsgSubstr = ['slackup_settings', 'channel_pref_change'];
        var slackupConnectUrl = 'https://slackup.marlosoft.net';
        var sidebarSettingsPrefix = 'conf_sidebar_';
        var hiddenMessageKey = 'conf_hide_msg_ids';
        var slackupApiConf = 'conf_slackup_api_conf';
        var authWindow = null;

        function _sort(a, b) {
            function getChannelName(c) {
                var $channel = $(c).find('span.overflow_ellipsis')
                    .first().clone().text().trim().replace(/\r?\n/g, '');
                if ($channel.substring(0, 1) == '#') $channel = $channel.substring(1).trim();

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

        function _getConfData(id) {
            var json = window.localStorage.getItem(sidebarSettingsPrefix + id);
            return json ? JSON.parse(json) : {"icon": "", "alias": ""};
        }

        function _injectChangPref(html) {
            var $div = $('<div>').html(html);
            var $li = $('<li>', {id: "channel_pref_change"}).html('<a>Channel preferences ...</a>');

            $li.insertAfter($div.find('li.divider').first());
            return $div.html();
        }

        function _renderSidebarName(html, type) {
            var has_icon = false;
            var $div = $('<div>').html(html);
            var $name = $div.find('a.' + type + '_name').attr('href');
            var $id = $div.find('a.' + type + '_name').data(type + '-id');
            var icon = (type == 'group') ? 'ts_icon_lock' : 'ts_icon_channel_pane_hash';
            try {
                var data = _getConfData($id);
                if (!data.icon && !data.alias) return html;
                var $ellipsis = $div.find('span.overflow_ellipsis');
                $ellipsis.empty();

                try {
                    var $prefix = $(TS.emoji.graphicReplace(data.icon, {force_img: true}));
                    if ($prefix.attr('src')) {
                        $prefix.css('margin', '-2px 3px 0 0');
                        has_icon = true;
                    }
                } catch (e) {}

                if (has_icon) $div.find('ts-icon').first().remove();
                var $ch = data.alias ? data.alias : $name.split('/')[2];
                $ellipsis.prepend($prefix);
                $ellipsis.append($ch);
                return $div.html();
            } catch (e) {
                return html;
            }
        }

        function _getConfigSettings() {
            var json = {};
            var keys = Object.keys(window.localStorage);
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (k.indexOf(sidebarSettingsPrefix) == 0) json[k] = JSON.parse(window.localStorage[k]);
            }

            return json;
        }

        function _downloadConfigFile() {
            var data = JSON.stringify(_getConfigSettings());
            var blob = new Blob([data]);
            var e = document.createEvent("HTMLEvents");
            e.initEvent("click");
            $("<a>", {
                download: 'slackup.' + TS.model.team.domain + '.config.json',
                href: URL.createObjectURL(blob)
            }).get(0).dispatchEvent(e);
        }

        function _setupConfigFile(conf) {
            var keys = Object.keys(conf);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (key.indexOf(sidebarSettingsPrefix) == 0) {
                    window.localStorage.setItem(key, JSON.stringify({
                        'icon': conf[key].icon,
                        'alias': conf[key].alias
                    }));
                }
            }

            TS.client.channel_pane.rebuild();
        }

        function _uploadConfigFile(e) {
            try {
                var file = e.target.files[0];
                if (file != null) {
                    var reader = new FileReader();
                    reader.addEventListener('load', function (evt) {
                        _setupConfigFile(JSON.parse(evt.target.result));
                    });
                    reader.readAsText(file);
                }
            } catch (ex) {
                console.error(ex);
            }
        }

        function _showSlackupPrefDialog() {
            var $contents = $("#fs_modal").find('.contents');
            $contents.html(_buildSlackupPrefDialog);
            $contents.find('input#import_json').change(_uploadConfigFile);
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

        function _buildSlackupPrefDialog() {
            var html = '<h2 id="prefs_slackup_local" class="inline_block">File Options</h2>'
                + '<p><a href="#" id="download_conf_btn" class="bold">'
                + '<i class="ts_icon ts_icon_download ts_icon_inherit"></i> Download</a> '
                + 'all your channel settings to a json file. You can share this to others to sync '
                + ' their settings with yours.</p>'
                + '<input data-inline-saver="#prefs_slackup_local" type="file" style="display:none" id="import_json"'
                + ' accept=".json" /><a id="upload_conf_btn" class="bold" data-inline-saver="#prefs_slackup_local">'
                + '<i class="ts_icon ts_icon_upload ts_icon_inherit"></i> '
                + 'Upload</a> a json configuration file and '
                + 'automatically update your channel aliases and icons</p><hr/>'
                + '<h2 id="prefs_slackup_online" class="inline_block small_bottom_margin">Slackup Connect!</h2>';

            if (window.localStorage.getItem(slackupApiConf) !== null) {
                var $emoji = $(TS.emoji.graphicReplace(':sunglasses:', {force_img: true}));
                $emoji.addClass('emoji-sizer');
                slackupApiData = JSON.parse(window.localStorage.getItem(slackupApiConf));
                html += '<p>Heads up! <code>' + slackupApiData.userEmail + '</code> '
                    + '<small><a href="#" id="unlinkSlackupConnect">unlink</a></small>'
                    + '<br/><input type="hidden" id="slackupApiToken" value="' + slackupApiData.apiToken + '" />'
                    + 'With slackup connect! you can easily restore you previous setting or backup your current '
                    + 'configuration instantly. No more hassle to download, upload and share files. '
                    + 'Just a few clicks away and you are ready to go! '
                    + $emoji[0].outerHTML + '<br/><br/>'
                    + '<button class="btn btn-sc" id="slackupBackup" data-loading-text="Creating backup ..."'
                    + 'style="min-width:200px">Backup Now</button>'
                    + '<br/><br/><button class="btn btn-sc btn_info" data-loading-text="Restoring data ..." '
                    + 'id="slackupRestore" style="min-width:200px">Restore Settings</button>'

            } else {
                html += '<p>Login to Slackup Connect! to backup or restore your current setting online.</p>'
                    + '<button id="slack-up-gauth" class="btn">Login using Google</button><br/>';
            }

            return html;
        }

        function _showChangeChannelInfoDialog() {
            channelPrefifx = TS.shared.getActiveModelOb().is_group ? "" : "#";
            TS.generic_dialog.start({
                title: "Channel Preferences: " + channelPrefifx + TS.shared.getActiveModelOb().name,
                body: _buildChangeChannelInfoDialog(),
                show_cancel_button: true,
                show_go_button: true,
                go_button_text: "Save Settings",
                esc_for_ok: true,
                onShow: function () {
                    var $div = TS.generic_dialog.div;
                    var data = _getConfData(TS.model.active_cid);

                    $div.find('#ch_alias').val($('<span>').html(data.alias).text());
                    $div.find('#ch_icon').val(data.icon);
                },
                onGo: function () {
                    var $div = TS.generic_dialog.div;
                    var $icon = $div.find('#ch_icon').val().trim();
                    var $alias = $div.find('#ch_alias').val().trim();

                    window.localStorage.setItem(sidebarSettingsPrefix + TS.model.active_cid, JSON.stringify({
                        'icon': TS.utility.htmlEntities($icon),
                        'alias': TS.utility.htmlEntities($alias)
                    }));

                    TS.client.channel_pane.rebuild();
                }
            });

        }

        var _tsError = TS.error;
        TS.error = function () {
            for (var k in excludedConsoleMsgSubstr) {
                if (arguments[0].indexOf(excludedConsoleMsgSubstr[k]) > -1) return;
            }

            _tsError(arguments[0])
        };

        var _tsWarn = TS.warn;
        TS.warn = function () {
            for (var k in excludedConsoleMsgSubstr) {
                if (arguments[0].indexOf(excludedConsoleMsgSubstr[k]) > -1) return;
            }

            _tsError(arguments[0])
        };

        var _rebuildChannelPane = TS.client.channel_pane.rebuild;
        TS.client.channel_pane.rebuild = function() {
            var args = ["starred", "channels", "ims"];
            args = (arguments.length == 0) ? args : arguments;
            _rebuildChannelPane.apply(this, args);
        }

        var _rebuildMsgs = TS.client.msg_pane.rebuildMsgs;
        TS.client.msg_pane.rebuildMsgs = function () {
            _rebuildMsgs();
            var $containers = $('div.day_container');
            if (!$containers.length) return;

            $containers.each(function (k, v) {
                var $div = $(v);
                var $day_msgs = $div.find('div.day_msgs');
                if (!$day_msgs.length || $day_msgs.first().html() == '') $div.remove();
            });
        }

        var _menuChannelItems = TS.templates.menu_channel_items;
        TS.templates.menu_channel_items = function (a) {
            return _injectChangPref(_menuChannelItems(a))
        };

        var _menuGroupItems = TS.templates.menu_group_items;
        TS.templates.menu_group_items = function (a) {
            return _injectChangPref(_menuGroupItems(a))
        };

        var _menuMessageActionItems = TS.templates.menu_message_action_items;
        TS.templates.menu_message_action_items = function (a) {
            var $div = $('<div>').html(_menuMessageActionItems(a));
            if ($div.find('#delete_link').length > 0) return $div.html();

            var $li = $('<li>', {
                "id": "hide_link",
                "class": "danger",
                "data-ts-message-id": TS.templates.makeMsgDomId(a.msg.ts)
            }).html('<a>Hide message (for me)</a>');

            if (!$div.find('li.divider').length) $div.append($('<li>', {"class": "divider"}));

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
            var msg_ids = JSON.parse(window.localStorage.getItem(hiddenMessageKey));
            if (msg_ids && msg_ids.hasOwnProperty($id) && msg_ids[$id]) return '';

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

        var _uiPrefsDialogStart = TS.ui.prefs_dialog.start;
        TS.ui.prefs_dialog.start = function (a, b, c) {
            a = (a == null) ? 'notifications' : a;
            _uiPrefsDialogStart(a, b, c);
        }

        var _templatesPrefSidebar = TS.templates.prefs_sidebar;
        TS.templates.prefs_sidebar = function (a, b) {
            var html = _templatesPrefSidebar(a, b);
            html += '<li><a data-section="slackup_settings" class="sidebar_menu_list_item" >Slackup Options</a></li>';
            return html;
        };

        $(document.body).on('click', '[id="channel_pref_change"]', function (e) {
            e.preventDefault();
            TS.menu.end();
            _showChangeChannelInfoDialog();
        });

        $(document.body).on('click', '[id="hide_link"]', function (e) {
            var $id = $(this).data('ts-message-id');
            var data = JSON.parse(window.localStorage.getItem(hiddenMessageKey));
            data = data ? data : {};
            data[$id] = true;

            window.localStorage.setItem(hiddenMessageKey, JSON.stringify(data));
            TS.client.msg_pane.rebuildMsgs();
        });

        $(document.body).on('click', '[id="download_conf_btn"]', function (e) {
            e.preventDefault();
            _downloadConfigFile();
        });

        $(document.body).on('click', '[id="upload_conf_btn"]', function (e) {
            e.preventDefault();
            $('input#import_json').trigger('click');
        });

        $(document.body).on('click', '[data-section="slackup_settings"]', function (e) {
            e.preventDefault();
            _showSlackupPrefDialog();
        });

        $(document.body).on('click', 'button#slack-up-gauth', function (e) {
            e.preventDefault();
            $(this).prop('enabled', false);
            var w = 500;
            var h = 500;
            var left = (screen.width / 2) - (w / 2);
            var top = (screen.height / 2) - (h / 2);
            var windowName = "Slack-Up Connect!";
            var windowFeatures = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, '
                + 'resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left;

            authWindow = window.open(slackupConnectUrl + '/auth/connect/', windowName, windowFeatures);
            authWindow.focus();
        });

        $(document.body).on('click', 'a#unlinkSlackupConnect', function (e) {
            e.preventDefault();
            var unlink = confirm('Are you sure to unlink this account?');
            if (!unlink) return;

            window.localStorage.removeItem(slackupApiConf);
            _showSlackupPrefDialog();
        });

        $(document.body).on('click', 'button#slackupBackup', function (e) {
            e.preventDefault();
            var $team = btoa(TS.model.team.id);
            var $btnSc = $('button.btn-sc');
            var $btn = $('button#slackupBackup');
            var slackup = JSON.parse(window.localStorage.getItem(slackupApiConf));
            var data = {token: slackup.apiToken, json: JSON.stringify(_getConfigSettings())};

            $btnSc.attr('disabled', 'disabled');
            $btn.button('loading');
            $.post(slackupConnectUrl + '/backup/team/' + $team, data, function (response) {
                TS.ui.inline_saver.show({target: $btn, hide_msg: true});
                $btnSc.removeAttr('disabled');
                $btn.button('reset');
                TS.info('slackup setting has been successfully backuped');
            }).fail(function (xhr) {
                $btn.button('reset');
                $btnSc.removeAttr('disabled');
                alert(xhr.responseJSON.message);
                TS.error(xhr.responseJSON.message);
            });
        });

        $(document.body).on('click', 'button#slackupRestore', function (e) {
            e.preventDefault();
            var $team = btoa(TS.model.team.id);
            var $btnSc = $('button.btn-sc');
            var $btn = $('button#slackupRestore');
            var slackup = JSON.parse(window.localStorage.getItem(slackupApiConf));
            var data = {token: slackup.apiToken};

            $btnSc.attr('disabled', 'disabled');
            $btn.button('loading');
            $.get(slackupConnectUrl + '/restore/team/' + $team, data, function (json) {
                _setupConfigFile(json)
                TS.ui.inline_saver.show({target: $btn});
                $btnSc.removeAttr('disabled');
                $btn.button('reset');
                TS.info('slackup setting has been successfully restored');
            }).fail(function (xhr) {
                $btn.button('reset');
                $btnSc.removeAttr('disabled');
                alert(xhr.responseJSON.message);
                TS.error(xhr.responseJSON.message);
            });
        });

        $(window).on('message', function (e) {
            if (authWindow !== null) {
                authWindow.close();
            }

            var data = e.originalEvent.data;
            if (data == null) return;

            var json = JSON.parse(data);
            window.localStorage.setItem(slackupApiConf, data);
            _showSlackupPrefDialog();
        });
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = '(' + code.toString() + ')();';
    document.body.appendChild(script);
})();
