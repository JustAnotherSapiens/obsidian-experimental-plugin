// Code extracted and modified from:
// https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/PromptModal.ts

import {
  App,
  ButtonComponent,
  Modal,
  Platform,
  TextAreaComponent,
  TextComponent,
} from 'obsidian';



class PromptModalError extends Error {
  constructor(message: string) {
    super(message);
  }
}


export async function runQuickPromptModal(app: App, args: {
  promptText: string,
  defaultValue?: string,
  multiline?: boolean,
  throwOnCancel?: boolean
}): Promise<string | undefined> {

  const prompt = new PromptModal(
    app, args.promptText, args.defaultValue, args.multiline
  );

  const promise = new Promise((
    resolve: (value: string) => void,
    reject: (reason?: PromptModalError) => void
  ) => {
    return prompt.openAndGetValue(resolve, reject);
  });

  try {
    return await promise;
  } catch (error) {
    if (args.throwOnCancel) throw error;
    return;
  }
}



export class PromptModal extends Modal {
    private resolve: (value: string) => void;
    private reject: (reason?: PromptModalError) => void;
    private submitted = false;
    private value: string;

    constructor(
        app: App,
        private prompt_text: string,
        private default_value?: string,
        private multi_line?: boolean,
    ) {
        super(app);
    }

    onOpen(): void {
        this.titleEl.setText(this.prompt_text);
        this.createForm();
    }

    onClose(): void {
        this.contentEl.empty();
        if (!this.submitted) {
            this.reject(new PromptModalError('Cancelled prompt'));
        }
    }

    createForm(): void {
        const div = this.contentEl.createDiv();
        div.addClass('modal-prompt-div');
        let textInput;
        if (this.multi_line) {
            textInput = new TextAreaComponent(div);

            // Add submit button since enter needed for multiline input on mobile
            const buttonDiv = this.contentEl.createDiv();
            buttonDiv.addClass('modal-button-div');
            const submitButton = new ButtonComponent(buttonDiv);
            submitButton.buttonEl.addClass('mod-cta');
            submitButton.setButtonText('Submit').onClick((evt: Event) => {
                this.resolveAndClose(evt);
            });
        } else {
            textInput = new TextComponent(div);
        }

        this.value = this.default_value ?? '';
        textInput.inputEl.addClass('modal-prompt-input');
        textInput.setPlaceholder('Type text here');
        textInput.setValue(this.value);
        textInput.onChange((value) => (this.value = value));
        textInput.inputEl.focus();
        textInput.inputEl.addEventListener('keydown', (evt: KeyboardEvent) =>
            this.enterCallback(evt)
        );
    }

    private enterCallback(evt: KeyboardEvent) {
        // Fix for Korean inputs https://github.com/SilentVoid13/Templater/issues/1284
        if (evt.isComposing || evt.keyCode === 229) return;

        if (this.multi_line) {
            if (Platform.isDesktop && evt.key === 'Enter' && !evt.shiftKey) {
                this.resolveAndClose(evt);
            }
        } else {
            if (evt.key === 'Enter') {
                this.resolveAndClose(evt);
            }
        }
    }

    private resolveAndClose(evt: Event | KeyboardEvent) {
        this.submitted = true;
        evt.preventDefault();
        this.resolve(this.value);
        this.close();
    }

    async openAndGetValue(
        resolve: (value: string) => void,
        reject: (reason?: PromptModalError) => void
    ): Promise<void> {
        this.resolve = resolve;
        this.reject = reject;
        this.open();
    }
}


