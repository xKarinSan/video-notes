import {
    useEffect,
    useState,
    useRef,
    cloneElement,
    isValidElement,
} from "react";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";

interface ApiKeyModalProps {
    children?: React.ReactNode;
    handleKeyChange?: (key: string) => void;
}

function ApiKeyModal({ children, handleKeyChange }: ApiKeyModalProps) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const [mounted, setMounted] = useState(false);

    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadApiKey();
    }, []);

    async function loadApiKey() {
        try {
            const savedKey = await window.settings?.getOpenAIKey();
            if (savedKey) setApiKey(savedKey);
        } catch (e) {
            console.error("Failed to load OpenAI key:", e);
        }
    }

    async function saveOpenAIApiKey() {
        try {
            await window.settings?.setOpenAIKey(apiKey);
            if (handleKeyChange) {
                handleKeyChange(apiKey);
            }
            toast.success("OpenAI API key saved.");
            dialogRef.current?.close();
        } catch (e) {
            console.error("Failed to save OpenAI key:", e);
        }
    }

    function openModal() {
        loadApiKey();
        dialogRef.current?.showModal();
    }

    const trigger = isValidElement(children) ? (
        cloneElement(children, {
            onClick: (e: any) => {
                children.props?.onClick?.(e);
                openModal();
            },
        })
    ) : (
        <div onClick={openModal}>{children}</div>
    );

    const modal = (
        <dialog
            ref={dialogRef}
            id="keyModal"
            className="modal"
            onClick={(e) => {
                if (e.target === dialogRef.current) {
                    dialogRef.current?.close();
                }
            }}
            onClose={() => setShowKey(false)}
        >
            <div className="modal-box">
                <h3 className="text-lg font-bold">Settings</h3>

                <div className="my-2">
                    <label>OpenAI API Key:</label>
                    <div className="flex align-middle mt-4 gap-2">
                        <input
                            type={showKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your OpenAI API key"
                            className="input input-bordered w-full m-auto"
                            autoComplete="off"
                            spellCheck={false}
                        />

                        <button
                            onClick={() => setShowKey((v) => !v)}
                            className="btn m-auto text-white"
                            type="button"
                            aria-label={
                                showKey ? "Hide API key" : "Show API key"
                            }
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
                            onClick={saveOpenAIApiKey}
                            className="btn bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop bg-black/80">
                <button>close</button>
            </form>
        </dialog>
    );

    return (
        <>
            {children ? trigger : null}
            {mounted ? createPortal(modal, document.body) : null}
        </>
    );
}

export default ApiKeyModal;
