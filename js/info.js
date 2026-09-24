export function createInfoDialogController({
  dialog,
  triggers,
  closeButton,
  scrollRoot,
}) {
  if (!dialog || !closeButton || !triggers?.length) return null;

  let returnFocus = null;
  let previousOverflow = "";

  const restorePage = () => {
    if (scrollRoot?.style) scrollRoot.style.overflow = previousOverflow;
    returnFocus?.focus();
    returnFocus = null;
  };

  const closeDialog = () => {
    if (!dialog.open) return;

    if (typeof dialog.close === "function") {
      dialog.close();
      return;
    }

    dialog.removeAttribute("open");
    restorePage();
  };

  const openDialog = (event) => {
    if (dialog.open) return;

    returnFocus = event.currentTarget;
    if (scrollRoot?.style) {
      previousOverflow = scrollRoot.style.overflow;
      scrollRoot.style.overflow = "hidden";
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    closeButton.focus();
  };

  const handleKeydown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeDialog();
  };

  for (const trigger of triggers) trigger.addEventListener("click", openDialog);
  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("keydown", handleKeydown);
  dialog.addEventListener("close", restorePage);

  return { openDialog, closeDialog };
}

if (typeof document !== "undefined") {
  const dialog = document.querySelector("#info-dialog");
  const triggers = [...document.querySelectorAll("[data-info-open]")];
  const closeButton = document.querySelector("#info-close-button");

  createInfoDialogController({
    dialog,
    triggers,
    closeButton,
    scrollRoot: document.body,
  });
}
