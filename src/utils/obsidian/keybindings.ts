import {
  Scope,
  Modifier,
} from "obsidian";



function registerKeybinding(
  scope: Scope,
  modifiers: Modifier[],
  key: string | null,
  callback: (event: KeyboardEvent) => void | Promise<void>
): void {
  scope.register(modifiers, key,
    async (event: KeyboardEvent) => {
      if (!event.isComposing) {
        event.preventDefault();
        await callback(event);
        return false;
      }
    }
  );
}


export default function registerKeybindings(
  scope: Scope,
  bindings: [
    modifiers: Modifier[],
    key: string | null,
    callback: (event: KeyboardEvent) => void,
  ][]
): void {
  bindings.forEach(
    (binding) => registerKeybinding(scope, ...binding)
  );
}

