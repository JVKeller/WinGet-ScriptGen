import React, { useState, useEffect, useCallback } from 'react';
import CodeBlock from './CodeBlock';
import { InfoIcon } from './icons/InfoIcon';
import { XCircleIcon } from './icons/XCircleIcon';

const ScriptGenerator: React.FC = () => {
  const [logPath, setLogPath] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('wingetConfig_logPath');
      return saved ? JSON.parse(saved) : 'C:\\temp\\winget-logs';
    } catch {
      return 'C:\\temp\\winget-logs';
    }
  });
  const [currentExclusionInput, setCurrentExclusionInput] = useState<string>('');
  const [exclusions, setExclusions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wingetConfig_exclusions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selfUpdateWinget, setSelfUpdateWinget] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wingetConfig_selfUpdateWinget');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [includeUnknown, setIncludeUnknown] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wingetConfig_includeUnknown');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [forceUpgrade, setForceUpgrade] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wingetConfig_forceUpgrade');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [excludeMs, setExcludeMs] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wingetConfig_excludeMs');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [generatedScript, setGeneratedScript] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('wingetConfig_logPath', JSON.stringify(logPath));
    } catch (error) {
      console.error("Failed to save logPath to localStorage", error);
    }
  }, [logPath]);

  useEffect(() => {
    try {
      localStorage.setItem('wingetConfig_exclusions', JSON.stringify(exclusions));
    } catch (error) {
      console.error("Failed to save exclusions to localStorage", error);
    }
  }, [exclusions]);

  useEffect(() => {
    try {
      localStorage.setItem('wingetConfig_selfUpdateWinget', JSON.stringify(selfUpdateWinget));
    } catch (error) {
      console.error("Failed to save selfUpdateWinget to localStorage", error);
    }
  }, [selfUpdateWinget]);
  
  useEffect(() => {
    try {
      localStorage.setItem('wingetConfig_includeUnknown', JSON.stringify(includeUnknown));
    } catch (error) {
      console.error("Failed to save includeUnknown to localStorage", error);
    }
  }, [includeUnknown]);
  
  useEffect(() => {
    try {
      localStorage.setItem('wingetConfig_forceUpgrade', JSON.stringify(forceUpgrade));
    } catch (error) {
      console.error("Failed to save forceUpgrade to localStorage", error);
    }
  }, [forceUpgrade]);

  useEffect(() => {
    try {
      localStorage.setItem('wingetConfig_excludeMs', JSON.stringify(excludeMs));
    } catch (error) {
      console.error("Failed to save excludeMs to localStorage", error);
    }
  }, [excludeMs]);

  const handleAddExclusion = useCallback(() => {
    // Standardize to lowercase for case-insensitive matching
    const newExclusion = currentExclusionInput.trim().toLowerCase();
    if (newExclusion && !exclusions.includes(newExclusion)) {
      setExclusions(prev => [...prev, newExclusion]);
      setCurrentExclusionInput('');
    }
  }, [currentExclusionInput, exclusions]);

  const handleRemoveExclusion = (exclusionToRemove: string) => {
    setExclusions(prev => prev.filter(ex => ex !== exclusionToRemove));
  };

  const handleExclusionInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddExclusion();
    }
  };
  
  const generateScript = useCallback(() => {
    const manualExclusionArgs = exclusions.length > 0
      ? exclusions.map(id => `        "${id}"`).join(',\n')
      : '';
      
    const msExclusionPatterns = [
      'Microsoft.Edge.*', 'Microsoft.Edge',
      'Microsoft.Teams.*', 'Microsoft.Office.*', 'Microsoft.365.*',
      'Microsoft.OneDrive', 'Microsoft.Skype', 'Microsoft.VCRedist.*',
      'Microsoft.VisualStudio.*', 'Microsoft.WindowsTerminal',
      'Microsoft.PowerShell.*', 'Microsoft.PowerToys', 'Microsoft.DotNet.*',
      'Microsoft.NET.*', 'Microsoft.WindowsSDK', 'Microsoft.WindowsAppRuntime.*'
    ];
    
    const msExclusionArgs = excludeMs 
      ? msExclusionPatterns.map(pattern => `        "${pattern}"`).join(',\n')
      : '';

    const includeUnknownArg = includeUnknown ? `$arguments += "--include-unknown"` : '';
    const forceArg = forceUpgrade ? `$arguments += "--force"` : '';

    const selfUpdateLogic = selfUpdateWinget ? `
    Write-Log "[STEP 2/4] Attempting to upgrade winget client..."
    try {
        # We specifically use the 'msstore' source as it's the official channel for the App Installer/winget.
        & "$wingetPath" upgrade Microsoft.DesktopAppInstaller --source msstore --accept-package-agreements --silent
        $exitCode = $LASTEXITCODE
        
        # A success code (0), reboot required (1641), or another success reboot code (3010) are all considered successful executions.
        if ($exitCode -eq 0 -or $exitCode -eq 1641 -or $exitCode -eq 3010) {
            Write-Log "INFO: Winget self-update command completed. Re-locating executable to ensure we use the newest version."
            
            # The path to winget might have changed after an update, so we MUST find it again.
            $originalPath = $wingetPath
            $wingetPath = Find-WingetExe
            
            if (-not $wingetPath) {
                Write-Log "FATAL: winget.exe could not be located after self-update attempt. Script cannot continue."
                Stop-Transcript
                exit 1
            }
            
            # Only re-check the version if the path has actually changed.
            if ($wingetPath -ne $originalPath) {
                 Write-Log "INFO: Winget path has changed to: $wingetPath"
                 # Re-check version after update as it's critical for determining feature support.
                 Write-Log "INFO: Re-checking winget version after update..."
                 $versionOutput = & "$wingetPath" --version
                 $wingetVersionString = ($versionOutput | Out-String).Trim()
                 try {
                    if ($wingetVersionString -match 'v?((?:\\\\d+\\\\.)*\\\\d+)') {
                        $versionString = $matches[1]
                        # The [version] constructor can fail on versions with more than 4 parts (e.g., from dev builds).
                        # We'll safely take up to the first 4 parts to prevent script errors.
                        $safeVersionString = ($versionString.Split('.')[0..3]) -join '.'
                        $wingetVersion = [version]$safeVersionString
                    } else {
                         $wingetVersion = [version]$wingetVersionString
                    }
                    Write-Log "INFO: Detected new winget version: $($wingetVersion.ToString())"
                 } catch {
                    Write-Log "WARN: Could not parse new winget version string: '$wingetVersionString'."
                 }
            } else {
                Write-Log "INFO: Winget path did not change. Continuing with version $($wingetVersion.ToString())."
            }
            
        } else {
            Write-Log "WARN: Winget self-update finished with a non-success exit code ($exitCode). This is often normal if it's already up-to-date. Continuing with existing version."
        }
    } catch {
         Write-Log "WARN: Winget self-update command failed to execute. This can happen on older systems where the msstore source is unavailable. Continuing with existing version."
         Write-Log "Exception: $($_.Exception.Message)"
    }
` : '';

    const stepCount = selfUpdateWinget ? 4 : 3;
    const sourceUpdateStep = selfUpdateWinget ? 3 : 2;
    const appUpdateStep = selfUpdateWinget ? 4 : 3;

    const script = `
# PowerShell Script for Silent Winget Updates via TRMM
# Generated on: ${new Date().toISOString()}
# ----------------------------------------------------
# This script is designed to run as SYSTEM. It will:
# 1. Create a log file in the specified directory.
# 2. Robustly locate the winget.exe executable.
# 3. Attempt to self-update winget to the latest version.
# 4. Update winget sources.
# 5. Fetch all available upgrades, filter out exclusions.
# 6. Upgrade remaining applications one-by-one.
# 7. Log all output and a final summary report to a transcript file.
# ----------------------------------------------------

# --- Configuration ---
$LogPath = "${logPath.replace(/\\/g, '\\\\')}"
$LogFile = Join-Path $LogPath "winget-updates-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
# --- End Configuration ---

# Function to write messages to both console and transcript
function Write-Log {
    param(
        [string]$Message
    )
    # This ensures the message appears in the TRMM logs and the transcript file
    Write-Host $Message
}

# Function to robustly find the winget executable
function Find-WingetExe {
    Write-Log "INFO: Attempting to locate winget.exe..."
    
    # 1. Check the standard location for App Execution Aliases for the SYSTEM profile
    $systemProfileWinget = Join-Path $env:SystemRoot "System32\\config\\systemprofile\\AppData\\Local\\Microsoft\\WindowsApps\\winget.exe"
    if (Test-Path $systemProfileWinget) {
        Write-Log "SUCCESS: Found winget.exe at the default SYSTEM user profile path: $systemProfileWinget"
        return $systemProfileWinget
    }
    Write-Log "INFO: winget.exe not found at the default SYSTEM profile path."

    # 2. If not found, try to resolve it from the AppX package information across all users.
    # This is more reliable as it finds the actual installation directory, which SYSTEM can access.
    try {
        $package = Get-AppxPackage -Name "Microsoft.DesktopAppInstaller" -AllUsers -ErrorAction Stop | Select-Object -First 1
        if ($package) {
            $wingetPathInPackage = Join-Path $package.InstallLocation "winget.exe"
            if (Test-Path $wingetPathInPackage) {
                Write-Log "SUCCESS: Found winget.exe via AppxPackage (AllUsers) at: $wingetPathInPackage"
                return $wingetPathInPackage
            }
        }
    } catch {
        Write-Log "WARN: Could not query AppxPackage for 'Microsoft.DesktopAppInstaller'. This might be an older system or winget is not installed."
        Write-Log "Exception: $($_.Exception.Message)"
    }
    Write-Log "INFO: Could not find winget.exe via AppxPackage."

    # 3. As a last resort, check if 'winget.exe' is in the system PATH
    # This can be unreliable as it might point to a user-specific path that SYSTEM cannot access.
    $wingetInPath = Get-Command "winget.exe" -ErrorAction SilentlyContinue
    if ($wingetInPath) {
        Write-Log "SUCCESS: Found winget.exe in the system PATH: $($wingetInPath.Source)"
        Write-Log "WARN: Using winget from PATH. This might fail if the path is in a user profile inaccessible to the SYSTEM account."
        return "winget.exe" # Return the command name to be executed directly
    }
    
    Write-Log "ERROR: All methods to find winget.exe failed."
    return $null
}


# --- Script Body ---

# Ensure the log directory exists
if (-not (Test-Path $LogPath -PathType Container)) {
    try {
        New-Item -Path $LogPath -ItemType Directory -Force -ErrorAction Stop | Out-Null
        Write-Host "Successfully created log directory at $LogPath"
    } catch {
        Write-Host "FATAL: Could not create log directory at $LogPath. Exiting."
        exit 1
    }
}

# Start logging all output to the specified file
try {
    Start-Transcript -Path $LogFile -ErrorAction Stop
} catch {
    Write-Host "FATAL: Could not start transcript at $LogFile. Check permissions. Exiting."
    exit 1
}

Write-Log "=================================================="
Write-Log "Starting Winget Upgrade Script at $(Get-Date)"
Write-Log "Log file will be saved to: $LogFile"
Write-Log "=================================================="

# Find winget.exe using our robust function
$wingetPath = Find-WingetExe

if (-not $wingetPath) {
    Write-Log "FATAL: winget.exe could not be located. The script cannot continue. Please ensure the 'App Installer' from the Microsoft Store is installed and updated."
    Stop-Transcript
    exit 1
}

# Set output encoding to UTF-8 to prevent character corruption when parsing winget's output.
$OutputEncoding = [System.Text.Encoding]::UTF8

try {
    Write-Log "[STEP 1/${stepCount}] Checking winget version..."
    $versionOutput = & "$wingetPath" --version
    $wingetVersionString = ($versionOutput | Out-String).Trim()
    $wingetVersion = [version]"0.0.0" # Default to a low version for safety

    try {
        # Attempt to parse a version string like 'v1.7.10911' or '1.8.0'
        if ($wingetVersionString -match 'v?((?:\\\\d+\\\\.)*\\\\d+)') {
            $versionString = $matches[1]
            # The [version] constructor can fail on versions with more than 4 parts (e.g., from dev builds).
            # We'll safely take up to the first 4 parts to prevent script errors.
            $safeVersionString = ($versionString.Split('.')[0..3]) -join '.'
            $wingetVersion = [version]$safeVersionString
        } else {
             # Fallback for any other unusual version formats
             $wingetVersion = [version]$wingetVersionString
        }
        Write-Log "INFO: Detected winget version: $($wingetVersion.ToString())"
    } catch {
        Write-Log "WARN: Could not parse winget version string: '$wingetVersionString'. Assuming an older version without --disable-interactivity support."
        # $wingetVersion remains at its default of 0.0.0
    }
${selfUpdateLogic}
    Write-Log "[STEP ${sourceUpdateStep}/${stepCount}] Updating winget sources..."
    & "$wingetPath" source update

    Write-Log "[STEP ${appUpdateStep}/${stepCount}] Searching for and applying application updates..."

    # Get the list of upgradable packages. We accept source agreements here to prevent prompts.
    Write-Log "INFO: Fetching list of available upgrades..."
    $upgradeOutput = & "$wingetPath" upgrade --accept-source-agreements
    
    if ($LASTEXITCODE -ne 0) {
        $outputStringForCheck = $upgradeOutput | Out-String
        # Some winget versions exit with a non-zero code when no updates are found.
        # We check the output to distinguish this from a genuine error.
        if ($outputStringForCheck -notmatch "No applicable update found" -and $outputStringForCheck -notmatch "No installed package found matching input criteria") {
            Write-Log "ERROR: 'winget upgrade' command failed with exit code $LASTEXITCODE. Cannot retrieve list of upgradable packages."
            Write-Log "This can happen if winget needs an update itself or if there's a problem with its sources."
            Write-Log "Winget output: $outputStringForCheck"
            throw "Winget upgrade list failed."
        }
        # If it was a "no updates found" error, we just log it and proceed. The parser will correctly find 0 packages.
        Write-Log "INFO: 'winget upgrade' returned a non-zero exit code but the output indicates no updates are available. This is normal for some versions. Continuing..."
    }
    
    # Combine multi-line output into a single string array for reliable parsing
    $lines = ($upgradeOutput | Out-String) -split "\`r?\`n"

    # Find the header line (it's the one before '---') and all subsequent package lines
    $headerLine = ""
    $packageLines = @()
    $separatorIndex = -1

    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -like '---*') {
            if ($i -gt 0) {
                $headerLine = $lines[$i - 1]
            }
            $separatorIndex = $i
            break
        }
    }

    if ($separatorIndex -ne -1) {
        $packageLines = $lines[($separatorIndex + 1)..$lines.Length] | Where-Object { $_.Trim().Length -gt 0 }
    }
    
    $upgradablePackageIds = @()

    if ($packageLines.Count -gt 0) {
        # Determine column positions based on the header line text to parse reliably
        # We search for " Id " with spaces to avoid matching 'Id' in a package name like 'Rapid'.
        $idColStart = $headerLine.IndexOf(' Id ')
        $versionColStart = $headerLine.IndexOf(' Version ')

        # If we can't find the column headers, parsing will be unreliable.
        if ($idColStart -lt 0 -or $versionColStart -lt 0) {
            Write-Log "WARN: Could not determine column layout from winget output header. This can happen if there are no packages to upgrade or the output format changed. Falling back to less reliable parsing."
            $upgradablePackageIds = foreach ($line in $packageLines) {
                # Fallback: Split by 2+ spaces and assume ID is the second column. This is not always reliable.
                $columns = $line.Trim() -split '\\\\s{2,}'
                if ($columns.Count -ge 2) { $columns[1].Trim() }
            }
        } else {
            Write-Log "INFO: Parsing winget output using detected column positions for accuracy."
            $upgradablePackageIds = foreach ($line in $packageLines) {
                if ($line.Length -gt $versionColStart) {
                    # Extract the ID based on calculated column position
                    $line.Substring($idColStart, $versionColStart - $idColStart).Trim()
                }
            }
        }
    }
    
    if ($upgradablePackageIds.Count -eq 0) {
        Write-Log "INFO: No application updates found."
    } else {
        Write-Log "INFO: Found $($upgradablePackageIds.Count) potential updates. Applying exclusions..."
        
        # --- Define Exclusions ---
        # Manual exclusions are standardized to lowercase for reliable, case-insensitive matching.
        $manualExclusions = @(
${manualExclusionArgs}
        )
        
        $msExclusionPatterns = @(
${msExclusionArgs}
        )
        # --- End Exclusions ---
        
        $packagesToUpgrade = @()
        foreach ($packageId in $upgradablePackageIds) {
            $isExcluded = $false
            
            # Check against manual exact-match exclusions (case-insensitive)
            if ($manualExclusions -contains $packageId.ToLower()) {
                $isExcluded = $true
                Write-Log "INFO: Skipping '$packageId' due to manual exclusion."
            }
            
            # Check against MS wildcard patterns
            if (!$isExcluded -and $msExclusionPatterns.Count -gt 0) {
                foreach ($pattern in $msExclusionPatterns) {
                    if ($packageId -like $pattern) {
                        $isExcluded = $true
                        Write-Log "INFO: Skipping '$packageId' due to Microsoft exclusion pattern '$pattern'."
                        break # Exit inner loop once a match is found
                    }
                }
            }
            
            if (!$isExcluded) {
                $packagesToUpgrade += $packageId
            }
        }
        
        if ($packagesToUpgrade.Count -gt 0) {
            Write-Log "INFO: Attempting to upgrade $($packagesToUpgrade.Count) filtered packages..."
            $totalPackages = $packagesToUpgrade.Count
            $currentPackage = 0
            $successfullyUpgraded = @()
            $failedUpgrades = @()

            foreach ($packageId in $packagesToUpgrade) {
                $currentPackage++
                Write-Log "--- [$currentPackage/$totalPackages] Upgrading package: $packageId ---"
                
                $arguments = @(
                    "upgrade",
                    "--id", $packageId,
                    "--silent",
                    "--accept-source-agreements",
                    "--accept-package-agreements",
                    "--source", "winget"
                )

                # The --disable-interactivity flag is crucial for TRMM but was added in winget v1.3.
                # Conditionally add it to maintain backward compatibility.
                if ($wingetVersion -ge [version]"1.3.0") {
                    $arguments += "--disable-interactivity"
                } else {
                    Write-Log "INFO: Skipping --disable-interactivity for older winget version $wingetVersion."
                }
                
                # Add optional arguments
                ${includeUnknownArg}
                ${forceArg}
                
                Write-Log "Executing Command: & '$($wingetPath.Replace("'", "''"))' $($arguments -join ' ')"
                & "$wingetPath" $arguments
                
                $exitCode = $LASTEXITCODE
                if ($exitCode -eq 0 -or $exitCode -eq 1641 -or $exitCode -eq 3010) {
                    Write-Log "SUCCESS: Package '$packageId' upgrade finished with code: $exitCode."
                    $successfullyUpgraded += @{ ID = $packageId; ExitCode = $exitCode }
                } elseif ($exitCode -eq -1978335188) { # WINGET_EXIT_CODE_INSTALLER_HASH_MISMATCH
                     Write-Log "ERROR: Package '$packageId' failed with an INSTALLER HASH MISMATCH. This is an issue with the package manifest and not the script."
                     $failedUpgrades += @{ ID = $packageId; ExitCode = $exitCode; Reason = 'Installer Hash Mismatch' }
                } else {
                    Write-Log "ERROR: Package '$packageId' upgrade failed with exit code: $exitCode. See winget return code documentation for details."
                    $failedUpgrades += @{ ID = $packageId; ExitCode = $exitCode; Reason = 'See winget documentation' }
                }
                Write-Log "----------------------------------------------------"
            }
            Write-Log "INFO: Finished processing all packages."
            
            # --- Generate Final Report ---
            Write-Log ""
            Write-Log "=================================================="
            Write-Log "               Upgrade Summary Report"
            Write-Log "=================================================="
            Write-Log ""

            if ($successfullyUpgraded.Count -gt 0) {
                Write-Log "SUCCESSFUL UPGRADES ($($successfullyUpgraded.Count) total):"
                foreach ($package in $successfullyUpgraded) {
                    Write-Log "  - $($package.ID) (Exit Code: $($package.ExitCode))"
                }
            } else {
                Write-Log "SUCCESSFUL UPGRADES: None"
            }
            
            Write-Log ""

            if ($failedUpgrades.Count -gt 0) {
                Write-Log "FAILED UPGRADES ($($failedUpgrades.Count) total):"
                foreach ($package in $failedUpgrades) {
                    Write-Log "  - $($package.ID) (Exit Code: $($package.ExitCode) - Reason: $($package.Reason))"
                }
            } else {
                Write-Log "FAILED UPGRADES: None"
            }
            
            Write-Log ""
            Write-Log "=================================================="
            # --- End of Report ---

        } else {
            Write-Log "INFO: All found updates were excluded. No packages to upgrade."
        }
    }

} catch {
    Write-Log "ERROR: An unexpected PowerShell error occurred during the winget execution."
    Write-Log "Exception Message: $($_.Exception.Message)"
    Write-Log "Script StackTrace: $($_.ScriptStackTrace)"
}

Write-Log "=================================================="
Write-Log "Script finished at $(Get-Date)"
Write-Log "=================================================="

# Stop logging
Stop-Transcript
`;
    setGeneratedScript(script.trim());
  }, [logPath, exclusions, includeUnknown, forceUpgrade, excludeMs, selfUpdateWinget]);

  useEffect(() => {
    generateScript();
  }, [generateScript]);

  return (
    <div className="space-y-8">
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-white mb-6">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="logPath" className="block text-sm font-medium text-slate-300 mb-2">
              Log File Directory
            </label>
            <input
              type="text"
              id="logPath"
              value={logPath}
              onChange={(e) => setLogPath(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              placeholder="e.g., C:\\temp\\logs"
            />
          </div>
          <div>
            <label htmlFor="exclusions" className="block text-sm font-medium text-slate-300 mb-2">
              Exclude a Package (Optional)
            </label>
             <div className="flex gap-2">
                <input
                  type="text"
                  id="exclusions"
                  value={currentExclusionInput}
                  onChange={(e) => setCurrentExclusionInput(e.target.value)}
                  onKeyDown={handleExclusionInputKeyDown}
                  className="flex-grow w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                  placeholder="e.g., Git.Git"
                />
                <button
                  type="button"
                  onClick={handleAddExclusion}
                  className="bg-cyan-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-colors duration-200"
                >
                  Add
                </button>
             </div>
             <p className="text-xs text-slate-500 mt-2">
              Enter a winget package ID and press Enter or click Add. Exclusions are case-insensitive.
             </p>
            {exclusions.length > 0 && (
                <div className="mt-3 bg-slate-900/70 p-3 rounded-md max-h-32 overflow-y-auto">
                    <ul className="space-y-2">
                        {exclusions.map(ex => (
                            <li key={ex} className="flex items-center justify-between bg-slate-800 px-2 py-1 rounded-md text-sm">
                                <span className="font-mono text-cyan-300">{ex}</span>
                                <button 
                                    onClick={() => handleRemoveExclusion(ex)}
                                    className="text-slate-500 hover:text-red-400 transition-colors"
                                    aria-label={`Remove ${ex}`}
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Script Behavior</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                    <input
                        id="excludeMs"
                        aria-describedby="excludeMs-description"
                        name="excludeMs"
                        type="checkbox"
                        checked={excludeMs}
                        onChange={(e) => setExcludeMs(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-600 focus:ring-cyan-600"
                    />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                    <label htmlFor="excludeMs" className="font-medium text-slate-200">
                        Exclude Microsoft Products
                    </label>
                    <p id="excludeMs-description" className="text-slate-400">
                        Skips common Microsoft apps like Edge, Office, etc. (Recommended)
                    </p>
                    </div>
                </div>
                 <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                    <input
                        id="selfUpdateWinget"
                        aria-describedby="selfUpdateWinget-description"
                        name="selfUpdateWinget"
                        type="checkbox"
                        checked={selfUpdateWinget}
                        onChange={(e) => setSelfUpdateWinget(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-600 focus:ring-cyan-600"
                    />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                    <label htmlFor="selfUpdateWinget" className="font-medium text-slate-200">
                        Attempt to Self-Update Winget
                    </label>
                    <p id="selfUpdateWinget-description" className="text-slate-400">
                        Tries to upgrade winget itself before updating other apps. (Recommended)
                    </p>
                    </div>
                </div>
                 <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                    <input
                        id="includeUnknown"
                        aria-describedby="includeUnknown-description"
                        name="includeUnknown"
                        type="checkbox"
                        checked={includeUnknown}
                        onChange={(e) => setIncludeUnknown(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-600 focus:ring-cyan-600"
                    />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                    <label htmlFor="includeUnknown" className="font-medium text-slate-200">
                        Include Unknown Versions
                    </label>
                    <p id="includeUnknown-description" className="text-slate-400">
                        Allows winget to upgrade apps even if it can't determine the current version.
                    </p>
                    </div>
                </div>
                 <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                    <input
                        id="forceUpgrade"
                        aria-describedby="forceUpgrade-description"
                        name="forceUpgrade"
                        type="checkbox"
                        checked={forceUpgrade}
                        onChange={(e) => setForceUpgrade(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-600 focus:ring-cyan-600"
                    />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                    <label htmlFor="forceUpgrade" className="font-medium text-slate-200">
                        Force Upgrade
                    </label>
                    <p id="forceUpgrade-description" className="text-slate-400">
                        Forces re-installation of the package if the installed version is not recognized.
                    </p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <InfoIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-semibold text-white">How It Works & Generated Script</h2>
              <p className="text-slate-400">
                  This script robustly finds winget, creates a detailed log file at <code className="bg-slate-700 text-cyan-300 text-xs px-1 py-0.5 rounded">{logPath}</code>, and installs updates silently.
              </p>
            </div>
          </div>
        </div>
        <CodeBlock code={generatedScript} language="powershell" />
      </div>
    </div>
  );
};

export default ScriptGenerator;