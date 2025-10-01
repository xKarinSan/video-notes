import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import ApiKeyModal from "./components/ApiKeyModal";

function Layout() {
    const isDev = process.env.NODE_ENV === "development";
    const loc = useLocation();

    useEffect(() => {
        const toSave = isDev
            ? loc.pathname + window.location.search + window.location.hash // BrowserRouter
            : window.location.hash || "/"; // HashRouter (persists "#/...")

        window.settings.savePath(toSave);
    }, [loc]);

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
                            <ApiKeyModal>
                                <button className="flex items-center gap-2">
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
                            </ApiKeyModal>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
}

export default Layout;
