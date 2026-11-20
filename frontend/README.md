# LocalAIMind Frontend

This frontend is the React + Vite client for the LocalAIMind private RAG app. It connects to the FastAPI backend, lets users upload PDFs, select an Ollama model, ask questions, and view grounded answers with source references.

The app is designed around a simple UI flow:

- load models and existing sessions
- upload and attach PDFs
- send a question to the backend
- render chat responses with source labels
- store session state locally in Zustand

## Frontend stack

- React 19
- Vite
- Zustand for state management
- Axios for API calls
- React Markdown for answer rendering
- Sonner for toast notifications
- Tailwind CSS for styling
- Lucide React for icons

## Folder structure

### frontend/
Main frontend app root.

- `package.json`  
  - Use: project dependency and script definition.
  - What it does: defines the Vite scripts (`dev`, `build`, `preview`, `lint`), frontend dependencies, and project metadata.

- `vite.config.js`  
  - Use: Vite configuration for the app.
  - What it does: configures the dev server and build pipeline for the React frontend.

- `eslint.config.js`  
  - Use: linting configuration.
  - What it does: declares the rules used to keep the React codebase clean and consistent.

- `index.html`  
  - Use: app entry HTML page.
  - What it does: provides the root mount element (`#root`) that React renders into.

- `public/`  
  - Use: static public assets.
  - What it does: stores files served as-is by Vite, such as icons or other static resources.

- `dist/`  
  - Use: production build output.
  - What it does: contains the built frontend generated after running `npm run build`.

#### frontend/src/
This is the actual React app source code.

- `main.jsx`  
  - Use: app bootstrapping file.
  - Main functions: React root creation and `Toaster` setup.
  - What it does: mounts the React app to the DOM and sets up global toast notifications for the app.

- `App.jsx`  
  - Use: main app entry wrapper.
  - Main functions: `App()` and the sidebar initialization effect.
  - What it does: checks whether the sidebar is still initializing, shows the loading screen if needed, and otherwise renders the chat interface.

- `index.css`  
  - Use: global styling layer.
  - What it does: defines the base theme, resets, and overall styling for the frontend, including dark-mode layout styling.

#### frontend/src/api/
Contains API helper functions for backend communication.

- `localRagApi.js`  
  - Use: centralized Axios API client.
  - Main functions: `getModels()`, `listPdfs()`, `uploadPdfApi()`, `deletePdfApi()`, `queryRagApi()`, `listSessionsApi()`, `renameSessionApi()`, `deleteSessionApi()`, and `getSessionMessagesApi()`.
  - What it does: wraps all backend endpoints used by the frontend so components do not call the API directly.

#### frontend/src/components/
Reusable UI blocks used across the app.

- `ChatInput.jsx`  
  - Use: message composer and PDF upload control.
  - Main functions: `ChatInput({ ...props })`.
  - What it does: lets the user type a question, choose a model, attach PDFs, upload a PDF file, and send the prompt to the backend.

- `ChatSection.jsx`  
  - Use: chat display panel.
  - Main functions: `ChatSection({ ...props })` and internal `MessageBubble()`.
  - What it does: shows the conversation history, renders assistant and user messages with Markdown formatting, and displays source badges for each answer.

- `Sidebar.jsx`  
  - Use: left navigation panel.
  - Main functions: `Sidebar({ ...props })`.
  - What it does: displays chat sessions, uploaded PDFs, session actions, rename/delete controls, and the PDF attachment toggle used for queries.

#### frontend/src/pages/
Page-level screens and app states.

- `ChatPage.jsx`  
  - Use: the main application page.
  - Main functions: `ChatPage()`.
  - What it does: combines the sidebar and chat area, loads the active session history, handles PDF uploads, manages chat selection, and wires the UI to Zustand store actions.

- `LoadingPage.jsx`  
  - Use: startup loading screen.
  - Main functions: `LoadingPage()`.
  - What it does: shows a spinner and loading message until the app finishes fetching models and uploaded PDFs from the backend.

#### frontend/src/store/
State management for the app.

- `sidebarStore.js`  
  - Use: application-level state for sessions, PDFs, and model selection.
  - Main functions: `initializeSidebar()`, `fetchModels()`, `fetchUploadedPdfs()`, `uploadPdf()`, `removePdf()`, `renameSession()`, `deleteSession()`, and `setCurrentSession()`.
  - What it does: stores the current chat sessions, available Ollama models, uploaded PDFs, and the selected model. It also calls the backend APIs when the app loads or changes state.

- `ragQueryStore.js`  
  - Use: chat and RAG query state.
  - Main functions: `loadSessionMessages()`, `sendMessage()`, `toggleAttachedPdf()`, `clearAttachedPdfIds()`, and `clearMessages()`.
  - What it does: manages the current conversation, attached PDF IDs, session message cache, and the loading/sending state while a question is being processed.

#### frontend/src/utils/
Small utility helpers.

- `notifications.js`  
  - Use: toast helper placeholder.
  - What it does: currently acts as a lightweight helper spot for custom notifications or toast behavior. It is not yet heavily implemented in the current UI flow.

## Runtime flow

The frontend works like this:

1. `App.jsx` starts the app and calls `initializeSidebar()`.
2. `sidebarStore.js` fetches the list of sessions, models, and uploaded PDFs from the FastAPI backend.
3. The user selects a model and uploads PDFs through the sidebar or chat input.
4. `ChatPage.jsx` connects the page to the current session and chat state.
5. `ragQueryStore.js` sends the question to `queryRagApi()` with the selected model and attached PDF IDs.
6. The backend returns an answer and source metadata.
7. `ChatSection.jsx` renders the final answer using `ReactMarkdown`, and source tags are shown under the response.

## Main user interaction

### Model selection
The user can choose an Ollama model from the dropdown in `ChatInput.jsx`. This value is stored in `sidebarStore.js` and sent with the query payload.

### PDF upload
The user clicks “Add PDF”, picks a file, and `uploadPdfApi()` sends the multipart request to the backend. The server saves the file, indexes it, and returns metadata to the frontend.

### Ask a question
The “Send” button triggers `sendMessage()` in `ragQueryStore.js`, which creates a user message, sends the question to the API, and stores the assistant answer once it arrives.

### Session management
The sidebar lets the user:
- create a new chat
- select a saved session
- rename a session
- delete a session
- attach or remove PDFs from the current query

## Development commands

From the frontend folder, use:

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

To lint the code:

```bash
npm run lint
```

## Notes

This project is a local-first setup, so the frontend depends on the backend being running before the app can fetch models, upload PDFs, or answer questions.

The app is intentionally split into:

- `api/` for server requests
- `components/` for reusable UI blocks
- `pages/` for screen-level composition
- `store/` for app state and data flow
- `utils/` for small helper utilities

This makes the frontend easier to maintain, test, and extend as the RAG application grows.
