'use babel';

export default class LocalnetPasteView {

    constructor(serializedState) {
        // Create root element
        this.element = document.createElement('div');
        this.element.classList.add('localnet-paste');

        this.showLoading();

    }

    // Returns an object that can be retrieved when package is activated
    serialize() {}

    // Tear down any state and detach
    destroy() {
        this.element.remove();
    }

    getElement() {
        return this.element;
    }

    showLoading() {
        while (this.element.firstChild)
            this.element.removeChild(this.element.firstChild);

        var message = document.createElement('span');
        message.classList.add('loading');
        message.classList.add('loading-spinner-large');
        message.classList.add('inline-block');
        this.element.appendChild(message);
    }

    showResults(results) {
        while (this.element.firstChild)
            this.element.removeChild(this.element.firstChild);

        if (!Object.keys(results).length) {
            var message = document.createElement('h3');
            message.textContent = 'No LocalNet Paste users in local network';
            this.element.appendChild(message);
            return;
        }

        var count = 1000;
        for (var i in results) {
            var guy = document.createElement('div');
            guy.classList.add('network-active-host');
            guy.setAttribute('tabindex', count++);
            guy.setAttribute('data-address', i);
            var image = document.createElement('img');
			if(results[i].hasOwnProperty('picture') && results[i].picture)
				image.setAttribute('src', results[i].picture);
            guy.appendChild(image);
            var name = document.createElement('div');
            name.classList.add('icon');
            name.classList.add('icon-gist-secret');
            var nameSpan = document.createElement('span');
            nameSpan.textContent = results[i].hostname;
            name.appendChild(nameSpan);
            guy.appendChild(name);
            this.element.appendChild(guy);
        }
        this.element.firstChild.focus();
    }

    setFocus(increment) {
        if (!increment) return;
        var toSelect = document.activeElement,
            decrement = increment / Math.abs(increment);

        if (toSelect.parentElement !== this.element && increment > 0) toSelect = this.element.lastChild;
        if (toSelect.parentElement !== this.element && increment < 0) toSelect = this.element.firstChild;

        while (increment != 0) {
			if(increment > 0){
	            toSelect = toSelect.nextSibling;
	            if (!toSelect) toSelect = this.element.firstChild;
			}
			if(increment < 0){
	            toSelect = toSelect.previousSibling;
            	if (!toSelect) toSelect = this.element.lastChild;
			}
            increment -= decrement;
        }
        toSelect.focus();
    }

	clickSelection() {
		if(document.activeElement.parentElement === this.element)
			document.activeElement.click();
	}

}
