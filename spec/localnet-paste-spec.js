'use babel';

import LocalnetPaste from '../lib/localnet-paste';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('LocalnetPaste', () => {
  let workspaceElement, activationPromise;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('localnet-paste');
  });

  describe('when the localnet-paste:paste event is triggered', () => {
    it('shows hosts to send clipboard to', () => {
      // Before the activation event the view is not on the DOM, and no panel
      // has been created
      expect(workspaceElement.querySelector('.localnet-paste')).not.toExist();

      // This is an activation event, triggering it will cause the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'localnet-paste:paste');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        expect(workspaceElement.querySelector('.localnet-paste')).toExist();

        let localnetPasteElement = workspaceElement.querySelector('.localnet-paste');
        expect(localnetPasteElement).toExist();

        let localnetPastePanel = atom.workspace.panelForItem(localnetPasteElement);
        expect(localnetPastePanel.isVisible()).toBe(true);
        atom.commands.dispatch(workspaceElement, 'localnet-paste:paste');
        expect(localnetPastePanel.isVisible()).toBe(false);
      });
    });

    it('hides and shows the view', () => {
      // This test shows you an integration test testing at the view level.

      // Attaching the workspaceElement to the DOM is required to allow the
      // `toBeVisible()` matchers to work. Anything testing visibility or focus
      // requires that the workspaceElement is on the DOM. Tests that attach the
      // workspaceElement to the DOM are generally slower than those off DOM.
      jasmine.attachToDOM(workspaceElement);

      expect(workspaceElement.querySelector('.localnet-paste')).not.toExist();

      // This is an activation event, triggering it causes the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'localnet-paste:paste');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        // Now we can test for view visibility
        let localnetPasteElement = workspaceElement.querySelector('.localnet-paste');
        expect(localnetPasteElement).toBeVisible();
        atom.commands.dispatch(workspaceElement, 'localnet-paste:paste');
        expect(localnetPasteElement).not.toBeVisible();
      });
    });
  });
});
