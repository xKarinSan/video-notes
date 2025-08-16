import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Video } from "../classes/Video";

function CurrentVideoPage() {
    const { videoId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [currentVideo, setCurrentVideo] = useState<Video>();
    const [currentVideoFilePath, setCurrentVideoFilePath] =
        useState<string>("");

    useEffect(() => {
        (async () => {
            const currentVideoInfo = await window.api.getCurrentVideo(videoId);
            if (!currentVideoInfo) {
                setIsLoading(false);
                return;
            }
            const { metadata, video_path } = currentVideoInfo;
            setCurrentVideo(metadata);
            setCurrentVideoFilePath(video_path);
            setIsLoading(false);
        })();
    }, []);
    return (
        // <div className="flex flex-col items-center justify-center p-6">
        //     <div className="card w-full max-w-2xl bg-base-200 shadow-xl">
        //         <div className="card-body items-center text-center">
        //             <h1 className="card-title text-2xl font-bold text-left">
        //                 {currentVideo?.name ?? "N/A"}
        //             </h1>

        //             {isLoading ? (
        //                 <span className="loading loading-spinner loading-lg mt-6"></span>
        //             ) : (
        //                 <video
        //                     className="rounded-lg border border-base-300 mt-4"
        //                     height="500"
        //                     width="500"
        //                     controls
        //                 >
        //                     <source
        //                         src={currentVideoFilePath}
        //                         type="video/mp4"
        //                     />
        //                 </video>
        //             )}
        //             <label className="self-start text-left">
        //                 By: {currentVideo?.op_name ?? "N/A"}
        //             </label>
        //         </div>
        //     </div>
        // </div>

        <div className="flex flex-col items-center justify-center p-6">
            <div className="flex w-full justify-start p-4">
                <button className="btn btn-ghost btn-sm">
                    <Link to="/videos"> ← Back</Link>
                </button>
            </div>
            <div className="card w-full max-w-2xl bg-base-200 shadow-xl">
                {/* Back button row */}

                <div className="card-body items-center text-center">
                    <h1 className="card-title text-2xl font-bold text-left w-full">
                        {currentVideo?.name ?? "N/A"}
                    </h1>

                    {isLoading ? (
                        <span className="loading loading-spinner loading-lg mt-6"></span>
                    ) : (
                        <video
                            className="rounded-lg border border-base-300 mt-4"
                            height="500"
                            width="500"
                            controls
                        >
                            <source
                                src={currentVideoFilePath}
                                type="video/mp4"
                            />
                        </video>
                    )}

                    <label className="self-start text-left w-full mt-2">
                        By: {currentVideo?.op_name ?? "N/A"}
                    </label>
                </div>
            </div>
        </div>
    );
}

export default CurrentVideoPage;
