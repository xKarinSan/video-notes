import NotFoundImg from "../../assets/notfound.png";
type AddEmptyPlaceholderProps = {
    title?: string;
    message?: string;
};

function EmptyPlaceholder({ title, message }: AddEmptyPlaceholderProps) {
    return (
        <div>
            <div className="card bg-base-300 w-fit m-5 mx-auto p-5 text-center text-lg text-white-500">
                <h1 className="text-2xl font-bold mb-4">
                    {title || "No data available"}
                </h1>
                <img
                    alt="Not Found"
                    className="mx-auto sm:w-32 md:w-40 lg:w-48 max-w-full h-auto object-contain"
                    src={NotFoundImg}
                />
                <p>{message || "Add something!"}</p>
            </div>
        </div>
    );
}

export default EmptyPlaceholder;
