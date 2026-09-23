import { createPreviewStorage } from "./storage.js";

// Development only: isolate saved state and pin the clock before app.js runs.
{
  const nativeStorage = window.localStorage;
  const previewStorage = createPreviewStorage(nativeStorage);
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: previewStorage,
  });

  const dateKey = window.sessionStorage.getItem("who-am-i-preview-date");
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? "")) {
    const NativeDate = window.Date;
    const fixedValue = `${dateKey}T12:00:00`;

    class ControlledDate extends NativeDate {
      constructor(...args) {
        super(...(args.length === 0 ? [fixedValue] : args));
      }

      static now() {
        return new NativeDate(fixedValue).getTime();
      }
    }

    window.Date = ControlledDate;
  }
}
