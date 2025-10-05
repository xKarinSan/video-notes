import { NotesMetadata } from "../classes/Notes";
import { useNavigate } from "react-router-dom";
import EmptyPlaceholder from "./EmptyPlaceholder";
interface NotesListProps {
    notesMetadataList: NotesMetadata[];
}

function NotesListComponent({ notesMetadataList }: NotesListProps) {
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
                                                className="card bg-base-300 w-full hover:cursor-pointer"
                                                key={id}
                                                onClick={() =>
                                                    navigate(`/notes/${id}`)
                                                }
                                            >
                                                <div className="card-body">
                                                    <h1 className="card-title text-lg md:text-2xl font-bold line-clamp-2 leading-snug h-[3.5rem] md:h-[4.5rem]">
                                                        {title}
                                                    </h1>
                                                    <hr />
                                                    <h1 className="text-md">
                                                        Created at:{" "}
                                                        {createdDateString}
                                                    </h1>
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
