import { useEffect, useState } from "react";
import AddNewVideo from "../components/AddNewVideo";
import ApiKeyModal from "../components/ApiKeyModal";

// only gets the API keys

function Homepage() {
    // on load
    async function loadApiKey() {
        const savedKey = await window.settings?.getOpenAIKey();
        if (savedKey) setApiKey(savedKey);
    }
    useEffect(() => {
        loadApiKey();
    }, []);

    // check changes
    const [apiKey, setApiKey] = useState("");
    function apiKeyChange(newApiKey: string) {
        console.log("Homepage | apiKeyChange ", newApiKey);
        setApiKey(newApiKey);
    }
    useEffect(() => {
        console.log("Homepage | apiKey ", apiKey);
    }, [apiKey]);

    return (
        <div className="p-5">
            <h1 className="text-3xl font-bold mb-4">🎉 Welcome to VNotes!</h1>
            <p className="text-white-500 mb-6">
                Start by adding a new video below to create notes and snapshots.
            </p>
            {apiKey ? (
                <></>
            ) : (
                <div className="badge bg-red-700 my-3 p-5">
                    <span>
                        Please add your OpenAI API key for the best experience{" "}
                        <ApiKeyModal handleKeyChange={apiKeyChange}>
                            <span className="inline-flex items-center gap-1 underline font-semibold cursor-pointer hover:opacity-80">
                                here
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.5 6H18m0 0v4.5M18 6l-6.5 6.5M15 18H6a2 2 0 01-2-2V9a2 2 0 012-2h5"
                                    />
                                </svg>
                            </span>
                        </ApiKeyModal>
                        .
                    </span>
                </div>
            )}

            <AddNewVideo />
        </div>
    );
}

export default Homepage;
