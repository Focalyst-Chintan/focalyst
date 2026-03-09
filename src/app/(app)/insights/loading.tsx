export default function InsightsLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-page-bg md:pl-60">
            <main className="flex-1 p-4 md:p-8 pb-32 animate-pulse space-y-6 max-w-[800px] w-full mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-8 bg-card-bg rounded w-32"></div>
                    <div className="h-5 bg-card-bg rounded w-24"></div>
                </div>

                {/* Tasks Completed */}
                <div className="bg-white rounded-3xl p-6 shadow-sm flex justify-between items-center w-full">
                    <div className="space-y-4">
                        <div className="h-6 bg-card-bg rounded w-32"></div>
                        <div className="h-4 bg-card-bg rounded w-48"></div>
                        <div className="h-10 bg-card-bg rounded w-20"></div>
                    </div>
                    <div className="w-24 h-24 rounded-full bg-card-bg"></div>
                </div>

                {/* Focus and Score */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex justify-between">
                            <div className="w-8 h-8 rounded-full bg-card-bg"></div>
                            <div className="w-12 h-6 rounded-full bg-card-bg"></div>
                        </div>
                        <div className="h-10 bg-card-bg rounded w-28"></div>
                        <div className="h-4 bg-card-bg rounded w-24"></div>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="w-8 h-8 rounded-full bg-card-bg"></div>
                        <div className="h-10 bg-card-bg rounded w-16"></div>
                        <div className="h-4 bg-card-bg rounded w-24"></div>
                    </div>
                </div>

                {/* Focus Activity */}
                <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-6 bg-card-bg rounded w-32"></div>
                        <div className="h-8 bg-card-bg rounded-2xl w-32"></div>
                    </div>
                    <div className="h-48 bg-card-bg rounded w-full"></div>
                </div>

                {/* Streaks */}
                <div className="space-y-4">
                    <div className="h-6 bg-card-bg rounded w-32"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-card-bg"></div>
                            <div className="h-5 bg-card-bg rounded w-20"></div>
                            <div className="h-4 bg-card-bg rounded w-24"></div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-card-bg"></div>
                            <div className="h-5 bg-card-bg rounded w-20"></div>
                            <div className="h-4 bg-card-bg rounded w-24"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
