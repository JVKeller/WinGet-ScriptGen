
import React from 'react';
import { PowerShellIcon } from './icons/PowerShellIcon';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-10">
      <div className="flex justify-center items-center gap-4 mb-4">
        <PowerShellIcon className="w-16 h-16 text-cyan-400" />
        <h1 className="text-4xl font-bold text-white tracking-tight">
          WinGet ScriptGen for TRMM
        </h1>
      </div>
      <p className="text-lg text-slate-400">
        Create a robust PowerShell script to silently update applications on remote machines.
      </p>
    </header>
  );
};

export default Header;