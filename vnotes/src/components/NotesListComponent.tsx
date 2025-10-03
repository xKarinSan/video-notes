import { NotesMetadata } from "../classes/Notes";
import { useNavigate } from "react-router-dom";
import EmptyPlaceholder from "./EmptyPlaceholder";
interface NotesListProps {
    notesMetadataList: NotesMetadata[];
    deleteNotes: (notesId: string) => void;
}

function NotesListComponent({
    notesMetadataList,
    deleteNotes,
}: NotesListProps) {
    const navigate = useNavigate();
    return (
        <div className="overflow-x-scroll">
            {notesMetadataList && notesMetadataList.length > 0 ? (
                <>
                    <div className="m-auto p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {notesMetadataList && notesMetadataList.length > 0 ? (
                            <>
                                {notesMetadataList?.map(
                                    (currentNotesMetadata) => {
                                        const {
                                            id,
                                            title,
                                            createdDate,
                                            lastEdited,
                                        } = currentNotesMetadata;
                                        const createdDateString = new Date(
                                            createdDate
                                        ).toLocaleString();
                                        const lastEditedDateString =
                                            lastEdited != -1
                                                ? new Date(
                                                      createdDate
                                                  ).toLocaleString()
                                                : "N/A";
                                        return (
                                            <div
                                                className="card bg-base-300 w-full"
                                                key={id}
                                            >
                                                <div className="card-body">
                                                    <h1 className="card-title text-lg md:text-2xl font-bold line-clamp-2 leading-snug h-[3.5rem] md:h-[4.5rem]">
                                                        {title}
                                                    </h1>
                                                    <hr />
                                                    <h1 className="text-md">
                                                        Created at:
                                                        {createdDateString}
                                                    </h1>
                                                    <h1 className="text-md">
                                                        Last Edited at:{" "}
                                                        {lastEditedDateString}
                                                    </h1>
                                                    <div className="d-flex">
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/notes/${id}`
                                                                )
                                                            }
                                                            className="btn btn-black btn-xs btn-square m-2"
                                                            title="View note"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth={2}
                                                                stroke="currentColor"
                                                                className="w-5 h-5"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M16.862 4.487l2.651 2.651m-2.651-2.651a2.121 2.121 0 113.001 
               3.001L7.5 19.852H4.5v-3l12.362-12.365z"
                                                                />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                deleteNotes(id)
                                                            }
                                                            className="btn btn-black btn-xs btn-square m-2"
                                                            title="Delete note"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth={2}
                                                                stroke="currentColor"
                                                                className="w-5 h-5"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M6 7h12M9 7V4h6v3m-9 0v12a2 2 0 002 2h6a2 2 0 002-2V7"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </>
                        ) : (
                            <>
                                <EmptyPlaceholder
                                    title="Looks a bit empty..."
                                    message="How about writing something down?"
                                />
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <EmptyPlaceholder
                        title="Looks a bit empty..."
                        message="How about writing something down?"
                    />
                </>
            )}
        </div>
    );
}

export default NotesListComponent;
