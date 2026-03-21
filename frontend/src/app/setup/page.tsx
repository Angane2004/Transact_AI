"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authService, userService, UserProfile } from "@/lib/localStorageService";
import { motion } from "framer-motion";

const formSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    gender: z.string().min(1, "Please select a gender"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export default function SetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState<string>("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
        },
    });

    // Get phone number from session on mount
    useEffect(() => {
        const session = authService.getSession();
        if (session?.phone) {
            // Format phone number for display: +91XXXXXXXXXX -> +91 XXXXX XXXXX
            const phone = session.phone;
            if (phone.startsWith("+91") && phone.length === 13) {
                const digits = phone.slice(3);
                setPhoneNumber(`+91 ${digits.slice(0, 5)} ${digits.slice(5)}`);
            } else {
                setPhoneNumber(phone);
            }
        }
    }, []);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        try {
            const session = authService.getSession();
            const phone = session?.phone || "+919999999999";

            // Create profile object
            const profile: UserProfile = {
                phone,
                name: values.firstName,
                fullName: `${values.firstName} ${values.lastName}`,
                gender: values.gender,
                email: values.email || undefined,
                createdAt: new Date().toISOString(),
            };

            // Save to localStorage
            userService.saveProfile(profile);
            toast.success("Profile saved successfully!");

            // Navigate to loading page (the previous AI loading page)
            router.push("/loading");
        } catch (error: any) {
            console.error("Setup error:", error);
            toast.error("Failed to save profile: " + error.message);
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: -100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    duration: 0.6
                }}
                className="w-full max-w-md"
            >
                <Card className="w-full shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
                    <CardHeader>
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <CardTitle className="text-xl sm:text-2xl text-center bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Complete Your Profile
                            </CardTitle>
                        </motion.div>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <motion.form 
                                onSubmit={form.handleSubmit(onSubmit)} 
                                className="space-y-4 sm:space-y-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm sm:text-base">First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John" {...field} className="h-10 sm:h-11 text-sm sm:text-base" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm sm:text-base">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doe" {...field} className="h-10 sm:h-11 text-sm sm:text-base" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <FormField
                                        control={form.control}
                                        name="gender"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm sm:text-base">Gender</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                                                            <SelectValue placeholder="Select gender" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="male">Male</SelectItem>
                                                        <SelectItem value="female">Female</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm sm:text-base">Email (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" type="email" {...field} className="h-10 sm:h-11 text-sm sm:text-base" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="pt-2 sm:pt-4"
                                >
                                    <label className="text-sm sm:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Phone Number</label>
                                    <Input value={phoneNumber || "Loading..."} disabled className="mt-2 bg-muted h-10 sm:h-11 text-sm sm:text-base" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.9 }}
                                >
                                    <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base" disabled={loading || !phoneNumber}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Save & Continue
                                    </Button>
                                </motion.div>
                            </motion.form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
