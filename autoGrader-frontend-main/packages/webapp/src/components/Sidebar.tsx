"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGraduationCap,
    faFileSignature,
    faChartLine,
    faGear,
    faHouse,
    faKeyboard,
    faRobot,
    faFileCsv,
    faCode,
    faDatabase,
    faPuzzlePiece
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = () => {
    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass-panel border-r border-primary/10 flex flex-col z-50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg neon-glow">
                        <FontAwesomeIcon icon={faGraduationCap as any} className="text-background-dark text-xl" />
                    </div>
                    <span className="text-xl font-bold text-slate-100">AutoGrader</span>
                </div>

                <nav className="space-y-2">
                    <SidebarItem
                        href="/dashboard"
                        icon={faHouse}
                        label="Dashboard"
                    />
                    <SidebarItem
                        href="/assignment-generator/home"
                        icon={faKeyboard}
                        label="Assignments"
                    />
                    <SidebarItem
                        href="/rubric-generator/home"
                        icon={faFileSignature}
                        label="Rubrics"
                    />
                    <SidebarItem
                        href="/smart-grader"
                        icon={faFileCsv}
                        label="Smart Grader"
                    />
                    <SidebarItem
                        href="/json-tool"
                        icon={faCode}
                        label="JSON Processor"
                    />
                    <SidebarItem
                        href="/ai-assistant"
                        icon={faRobot}
                        label="AI Assistant"
                    />
                    <SidebarItem
                        href="/json-analyzer"
                        icon={faChartLine}
                        label="Analytics"
                    />
                    <SidebarItem
                        href="/extension-data"
                        icon={faPuzzlePiece}
                        label="Extension Data"
                    />
                </nav>
            </div>

            <div className="mt-auto p-6 space-y-2">
                <SidebarItem
                    href="/database-settings"
                    icon={faDatabase}
                    label="Database"
                />
                <SidebarItem
                    href="#"
                    icon={faGear}
                    label="Settings"
                />
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mt-4">
                    <p className="text-xs text-slate-400 mb-1 font-semibold">Pro Plan</p>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-primary neon-glow" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">67% of credits used</p>
                </div>
            </div>
        </aside>
    );
};

const SidebarItem = ({ href, icon, label }: { href: string; icon: any; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-primary/10 text-primary border border-primary/30 neon-glow'
                : 'text-slate-400 hover:bg-primary/5 hover:text-primary hover:border hover:border-primary/20'
                }`}
        >
            <FontAwesomeIcon
                icon={icon as any}
                className={`text-lg transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-slate-400'
                    }`}
            />
            <span className="font-medium">{label}</span>
        </Link>
    );
};

export default Sidebar;
