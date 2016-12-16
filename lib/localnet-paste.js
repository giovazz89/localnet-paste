'use babel';

import LocalnetPasteView from './localnet-paste-view';
import {
    CompositeDisposable,
	BufferedProcess,
	File, Directory
} from 'atom';

export default {

    config: {
        networkDisplayName: {
            type:    'string',
            default: ''
        }
    },

	localnetPasteView: null,
	modalPanel:        null,
	subscriptions:     null,
	port:              43151,
	server:            null,
	localNetworkPals:  {},
	hostname:          null,
	netmask:           null,
	profilePicture:    null,

    activate(state) {

        // set pc-name as networkDisplayName if nothing specified
        // =========================================================================
        if (!atom.config.get('localnet-paste.networkDisplayName'))
            atom.config.set('localnet-paste.networkDisplayName', os.hostname());
		atom.config.onDidChange('localnet-paste.networkDisplayName', this.updateMyData);


        // get profile picture if any
        // =========================================================================
		var fs = require( 'fs' );
		if( fs.existsSync( atom.getConfigDirPath()+'/localnet-paste/profile-pic' ) )
			this.profilePicture = fs.readFileSync( atom.getConfigDirPath()+'/localnet-paste/profile-pic', 'utf8' );


        this.getAddress();
        this.startListening();
        this.notifyPresence();

        // create graphical interface
        // =========================================================================

        this.localnetPasteView = new LocalnetPasteView(state.localnetPasteViewState);
        this.modalPanel = atom.workspace.addModalPanel({
            item:    this.localnetPasteView.getElement(),
            visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'localnet-paste:paste':         () => this.paste(),
            'localnet-paste:profile-image': () => this.chooseProfileImage(),
			'core:cancel':                  () => this.hide(),
			'core:move-right':              () => this.localnetPasteView.setFocus(1),
			'core:move-left':               () => this.localnetPasteView.setFocus(-1),
			'core:confirm':                 () => this.localnetPasteView.clickSelection()
        }));

		var selfReference = this;
		document.addEventListener('click', function (event) {
	        var qs = document.querySelectorAll('.localnet-paste .network-active-host');
	        if (qs) {
	            var el = event.target, index = -1;
	            while (el && ((index = Array.prototype.indexOf.call(qs, el)) === -1))
	                el = el.parentElement;
	            if (index > -1) {
					// send clipboard data
					var sendTo = el.getAttribute('data-address');

					var params = [];
					params.push('ipaddress='+ this.hostname);
					params.push('clipboard='+ atom.clipboard.read());
					params = params.join('&');

					var headers = new Headers();
					headers.append('Content-Type', 'application/x-www-form-urlencoded');

					fetch('http://'+sendTo+':'+this.port, {
						headers: headers,
						method:  'POST',
						body:    params
					}).then(function(response) {
						if (!response.ok) return response;
						atom.notifications.addSuccess('Clipoard pasted to <strong>'+selfReference.localNetworkPals[sendTo].hostname+'</strong>');
					}).catch(function(error){
						atom.notifications.addWarning('<strong>'+selfReference.localNetworkPals[sendTo].hostname+'</strong> is no more reachable');
					});

					if (selfReference.modalPanel.isVisible()) return selfReference.modalPanel.hide();
				}
	        }
	    });
    },

    deactivate() {
        this.stopListening();
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.localnetPasteView.destroy();
    },

    serialize() {
        return {
            localnetPasteViewState: this.localnetPasteView.serialize()
        };
    },

    paste() {
        if (this.modalPanel.isVisible()) return;
        else {
            this.localnetPasteView.showLoading();
			// check who still is online
			this.activeChecks = 0;
			if(!Object.keys(this.localNetworkPals).length) this.localnetPasteView.showResults({});
			for(var ip in this.localNetworkPals) this.ping(ip, true);

            return this.modalPanel.show();
        }
    },

	hide() { return this.modalPanel.hide(); },

    // set up the server to listen for other users
    // =========================================================================
    startListening() {
        const http    = require('http');
        const qs      = require('querystring');
        selfReference = this;
        this.server   = http.createServer((req, res) => {
            res.setHeader('Content-Type', 'text/plain');

            var params = null;
            if (req.method == 'POST') {
                var body = '';
                req.on('data', function(data) { body += data; });
                req.on('end', function() {
                    params = qs.parse(body);

					// new (or updated) user in local network
					// =========================================================
                    if (params && params.ipaddress && params.hostname) {
                        selfReference.localNetworkPals[params.ipaddress] = params;

                        var sendList = JSON.parse(JSON.stringify(selfReference.localNetworkPals));
                        delete sendList[params.ipaddress];
                        sendList[selfReference.hostname]           = {};
                        sendList[selfReference.hostname].hostname  = atom.config.get('localnet-paste.networkDisplayName');
                        sendList[selfReference.hostname].ipaddress = selfReference.hostname;
                        sendList[selfReference.hostname].picture   = selfReference.profilePicture;

                        res.setHeader('Content-Type', 'application/json');
                        res.statusCode = 200;
                        res.end(JSON.stringify(sendList));

					// receive a user clipboard
					// =========================================================
                    } else if (params && params.ipaddress && params.clipboard) {
						// get shared clipboard
	                    var netClipboard = params.clipboard;
						atom.notifications.addInfo(
							'<strong>'+selfReference.localNetworkPals[params.ipaddress].hostname+'</strong> pasted his clipboard to you',
							{
								dismissable: true,
								buttons: [
									{ text: ' Copy', className: 'icon icon-clippy', onDidClick: function(){
										atom.clipboard.write(netClipboard);
										selfReference.dismissNotificationFromButton(this);
									} },
									{ text: ' Ignore', className: 'icon icon-trashcan', onDidClick: function(){ selfReference.dismissNotificationFromButton(this); } }
								],
								icon: 'clippy',
								detail: params.clipboard.length < 43 ? params.clipboard : params.clipboard.substring(0, 40) +'...'
							});

                        res.statusCode = 200;
                        res.end('');

					// positive response on ping (sender IP included)
					// =========================================================
					} else if (params && params.ipaddress) {
		                res.statusCode = 200;
		                res.end('');

					// negative response (unauthorized) to invalid requests
					// =========================================================
					} else {
                        res.statusCode = 401;
                        res.end('');
                    }
                });
            } else {
                res.statusCode = 401;
                res.end('');
            }
        });
        this.server.listen(this.port, this.hostname, () => {
            console.log('Listening for other localNetwork devices');
        });
    },

    stopListening() {
        this.server.close();
    },

    // get current IP address
    // =========================================================================
    getAddress: function() {
        var os      = require('os');
        var ifaces  = os.networkInterfaces();
        var ipAddrs = [];
        Object.keys(ifaces).forEach(function(ifname) {
            ifaces[ifname].forEach(function(iface) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                if ('IPv4' !== iface.family || iface.internal !== false) return;
                ipAddrs.push(iface);
            });
        });
        // get the first IP of the first interface
        this.hostname = ipAddrs[0].address;
        this.netmask  = ipAddrs[0].netmask;
    },

    // notify other hosts of my presence in network
    // =========================================================================
    notifyPresence() {
		// send notification to all possible network IP addresses (exec ARP command - to narrow IP range - is slower)
		var baseIp    = this.hostname.split('.'),
			endIp     = this.hostname.split('.'),
			splitMask = this.netmask.split('.');
		for(var i = 0; i < 4; i++){
			baseIp[i] = baseIp[i] & splitMask[i];
			endIp[i]  = baseIp[i] | (255 - splitMask[i]);
		}

		var params = [];
		params.push('ipaddress='+ this.hostname);
		params.push('hostname='+ atom.config.get('localnet-paste.networkDisplayName'));
		params.push('picture='+ this.profilePicture);
		params = params.join('&');
		var headers = new Headers();
		headers.append('Content-Type', 'application/x-www-form-urlencoded');
        selfReference = this;
		do {
			if(baseIp.join('.') != this.hostname){
				// ajax request to all network IP addresses
				fetch('http://'+baseIp.join('.')+':'+this.port, {
					headers: headers,
					method:  'POST',
					body:    params
				}).then(function(response) {
					if (!response.ok) return response;
					var contentType = response.headers.get("content-type");
					if(contentType && contentType.indexOf("application/json") !== -1) {
						return response.json().then(function(json) {
							for(var jsonkey in json) if(json.hasOwnProperty(jsonkey))
		  						selfReference.localNetworkPals[jsonkey] = json[jsonkey];
						});
					}
			  	}).catch(function(error){ /* not an host */ });
			}

			// increment IP
			baseIp[3]++;
			baseIp[2] += Math.floor(baseIp[3] / 256); baseIp[3] = baseIp[3] % 256;
			baseIp[1] += Math.floor(baseIp[2] / 256); baseIp[2] = baseIp[2] % 256;
			baseIp[0] += Math.floor(baseIp[1] / 256); baseIp[1] = baseIp[1] % 256;
		} while(baseIp.join('.') != endIp.join('.'));
    },

	dismissNotificationFromButton(button){
		var el = button;
		while ((el = el.parentElement) && el.tagName.toLowerCase() != 'atom-notification');
		el.querySelector('.close.icon').click();
	},

	ping(ip, showResults = false){
		this.activeChecks++;
		selfReference = this;
		fetch('http://'+ip+':'+this.port, {
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			method:  'POST',
			body:    'ipaddress='+ this.hostname
		}).then(function(response) {
			if (!response.ok) delete selfReference.localNetworkPals[ip];
			if(! --selfReference.activeChecks && showResults)
				selfReference.localnetPasteView.showResults(selfReference.localNetworkPals);
		}).catch(function(error){
			delete selfReference.localNetworkPals[ip];
			if(! --selfReference.activeChecks && showResults)
				selfReference.localnetPasteView.showResults(selfReference.localNetworkPals);
		});
	},
	// TODO show current image
	chooseProfileImage(){
		// let user choose image

		var remote = require('electron').remote;
    	var files  = remote.dialog.showOpenDialog(
			remote.getCurrentWindow(),
			{
				title:      'Choose new profile image',
				filters:    [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
				properties: ['openFile']
			}
		);
		if(!files || files.length != 1) return;

		// get image
		var fs             = require( 'fs' );
		var fileContents   = fs.readFileSync( files[0] );
		var destProfilePic = new File( atom.getConfigDirPath()+'/localnet-paste/profile-pic' );
		fileContents       = 'data:image/'+ files[0].split('.').pop() +';base64,'+ (new Buffer(fileContents)).toString('base64');

		// TODO let user zoom & crop image

		// resize image
		var img           = document.createElement('img');
		var selfReference = this;

        img.onload = function(){
            var canvas = document.createElement('canvas');
            var ctx    = canvas.getContext('2d');

            // set resize dimensions ( 100px )
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(this, 0, 0, 100, 100);

            var dataURI = canvas.toDataURL();

			// save image
			selfReference.profilePicture = dataURI;
			destProfilePic.writeSync( selfReference.profilePicture );
			atom.notifications.addSuccess( 'Profile image set correctly' );

			// notify other users
			selfReference.updateMyData();
        };
    	img.src = fileContents;
	},

	updateMyData(){
		var params = [];
		params.push('ipaddress='+ this.hostname);
		params.push('hostname='+ atom.config.get('localnet-paste.networkDisplayName'));
		params.push('picture='+ this.profilePicture);
		params = params.join('&');
		var headers = new Headers();
		headers.append('Content-Type', 'application/x-www-form-urlencoded');

		for(var ip in this.localNetworkPals){
			fetch('http://'+ip+':'+this.port, {
				headers: headers, method: 'POST', body: params
			}).then(function(response) { /* don't care */ }).catch(function(error){ /* not an host */ });
		}
	}

};
