import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
function Layout() {
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        loadApiKey();
    }, []);

    function loadApiKey() {
        (async () => {
            try {
                const savedKey = await window.settings.getOpenAIKey();
                if (savedKey) setApiKey(savedKey);
            } catch (e) {
                console.error("Failed to load OpenAI key:", e);
            }
        })();
    }

    function saveOpenAIApiKey() {
        window.settings.setOpenAIKey(apiKey);
    }
    return (
        <>
            <div className="drawer sm:drawer-open">
                <input
                    id="my-drawer-3"
                    type="checkbox"
                    className="drawer-toggle"
                />
                <div className="drawer-content flex flex-col">
                    <div className="navbar bg-base-300 w-full">
                        <div className="flex-none sm:hidden">
                            <label
                                htmlFor="my-drawer-3"
                                aria-label="open sidebar"
                                className="btn btn-square btn-ghost"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    className="inline-block h-6 w-6 stroke-current"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    ></path>
                                </svg>
                            </label>
                        </div>
                        <div className="mx-2 flex-1 px-2">VNotes</div>
                        <div className="hidden flex-none sm:hidden">
                            <ul className="menu menu-horizontal">
                                <li>
                                    <Link to="/">Home</Link>
                                </li>
                                <li>
                                    <Link to="/videos">Videos</Link>
                                </li>
                                <li>
                                    <Link to="/notes">Notes</Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <Outlet />
                </div>
                <div className="drawer-side">
                    <label
                        htmlFor="my-drawer-3"
                        aria-label="close sidebar"
                        className="drawer-overlay"
                    ></label>
                    <ul className="menu bg-base-200 min-h-full w-50 p-4">
                        <li>
                            <Link to="/" className="flex items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 12l9-9 9 9M4.5 10.5v9.75A1.5 1.5 0 006 21h12a1.5 1.5 0 001.5-1.5v-9.75"
                                    />
                                </svg>
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/videos"
                                className="flex items-center gap-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3h9l6 6v10.5A1.5 1.5 0 0119.5 21z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9.75 9.75v4.5l3.75-2.25-3.75-2.25z"
                                    />
                                </svg>
                                Videos
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/notes"
                                className="flex items-center gap-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3h9l6 6v10.5A1.5 1.5 0 0119.5 21z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8.25 12h7.5M8.25 15h7.5M8.25 9h3.75"
                                    />
                                </svg>
                                Notes
                            </Link>
                        </li>
                        <li>
                            <button
                                className="flex items-center gap-2"
                                onClick={() => {
                                    loadApiKey();
                                    settingsModal.showModal();
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-5 h-5"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                Settings
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <dialog id="settingsModal" className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">Settings</h3>
                    <div className="my-2">
                        <label>OpenAI API Key:</label>
                        <div className="flex align-middle mt-4">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your OpenAI API key"
                                className="input input-bordered w-full m-auto"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="btn m-auto text-white"
                            >
                                {showKey ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3 3l18 18"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6.223 6.223A10.45 10.45 0 0112 4.5c4.477 0 8.268 2.943 9.542 7a10.44 10.44 0 01-4.422 5.292"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M10.477 10.477A3 3 0 0012 15a3 3 0 003-3"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4.458 12c.56-1.783 1.67-3.36 3.09-4.55M14.12 14.12c-1.013.56-2.182.88-3.37.88-3.035 0-5.78-1.67-7.29-4.25"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="modal-action">
                            <button
                                type="button"
                                onClick={() => {
                                    saveOpenAIApiKey();
                                }}
                                className="btn btn-primary"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
}

export default Layout;
