import Sidebar from "@/components/Sidebar";
import { PinLock } from "@/components/PinLock";
import { DensityProvider } from "@/lib/DensityContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DensityProvider>
            <div className="h-full relative">
                <Sidebar />
                <main className="md:pl-72 pb-10 relative">
                    <PinLock>
                        {children}
                    </PinLock>
                </main>
            </div>
        </DensityProvider>
    );
}
