/// <reference types="@wailsjs/runtime" />
import { main } from "../wailsjs/go/models";

interface Window {
  go: {
    main: {
      App: {
        LoadTasks: () => Promise<main.Task[]>;
        SaveTasks: (tasks: main.Task[]) => Promise<void>;
      };
    };
  };
}
