# Roots Media HR Management

A browser-based employee and task management app built with React, TypeScript, and Vite. Employee and task records are saved in the browser's `localStorage`.

## Requirements

- Node.js and npm

MongoDB and the backend server are not required.

## Run the app

From the project root:

```powershell
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). If that port is already in use, Vite will select another available port.

You can also start the frontend directly:

```powershell
cd frontend
npm install
npm run dev
```

## Features

- Create, view, edit, search, filter, sort, and delete employees.
- Create, view, edit, filter, sort, and export tasks as CSV.
- Assign tasks to employees and update task status.
- View employee workload and task summaries on the dashboard.
- Keep records between page loads using browser local storage.

## Where data is saved

The app stores employee and task data under the `roots-em-data` key in the browser's local storage for the current site. Data is specific to that browser and origin; it is not shared with other browsers, computers, or users, and it is not uploaded to a server.

To clear the app's saved data, open the browser developer console on the app's site and run:

```js
localStorage.removeItem('roots-em-data');
location.reload();
```

Clearing browser site data also removes these records. Existing MongoDB data is not automatically imported.

## Build

Build the frontend production bundle:

```powershell
cd frontend
npm run build
```

To run the Vite production preview after building:

```powershell
npm run preview
```