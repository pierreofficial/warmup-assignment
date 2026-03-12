const fs = require("fs");

//======================Helper Functions=======================
// Helper 1: Converts "hh:mm:ss am/pm" or "h:mm:ss" to total seconds
function timeToSeconds(timeStr) {
    // Check if there is an AM/PM period
    const parts = timeStr.trim().split(' ');
    const time = parts[0];
    const period = parts.length > 1 ? parts[1].toLowerCase() : null;

    let [hours, minutes, seconds] = time.split(':').map(Number);

    // Convert to 24-hour format if AM/PM is present
    if (period === 'pm' && hours !== 12) {
        hours += 12;
    } else if (period === 'am' && hours === 12) {
        hours = 0;
    }

    return (hours * 3600) + (minutes * 60) + seconds;
}

// Helper 2: Converts total seconds back to "h:mm:ss" format
function secondsToTime(totalSeconds) {
    // Handle edge case: if the shift crossed midnight, the difference might be negative
    if (totalSeconds < 0) {
        totalSeconds += 24 * 3600; 
    }

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Pad minutes and seconds with leading zeros if they are less than 10
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
}

// ============================================================










// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    // TODO: Implement this function
    
    const startSec = timeToSeconds(startTime);
    const endSec = timeToSeconds(endTime);

    const durationSec = endSec - startSec;

    return secondsToTime(durationSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // TODO: Implement this function
    const startSec = timeToSeconds(startTime);
    const endSec = timeToSeconds(endTime);
    
    // Define the delivery window in seconds
    const deliveryStart = timeToSeconds("8:00:00 am"); // 28800 seconds
    const deliveryEnd = timeToSeconds("10:00:00 pm");   // 79200 seconds

    let idleSeconds = 0;

    // 1. Calculate idle time before delivery hours start
    if (startSec < deliveryStart) {
        // If the shift ends before 8am, idle is the whole shift. 
        // Otherwise, it's from start until 8am.
        const morningEnd = Math.min(endSec, deliveryStart);
        idleSeconds += (morningEnd - startSec);
    }

    // 2. Calculate idle time after delivery hours end
    if (endSec > deliveryEnd) {
        // If the shift started after 10pm, idle is the whole shift.
        // Otherwise, it's from 10pm until the end.
        const nightStart = Math.max(startSec, deliveryEnd);
        idleSeconds += (endSec - nightStart);
    }

    return secondsToTime(idleSeconds);

}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // TODO: Implement this function
    const totalSec = timeToSeconds(shiftDuration);
    const idleSec = timeToSeconds(idleTime);
    
    const activeSec = totalSec - idleSec;
    
    // Ensure we don't return a negative time due to rounding or edge cases
    return secondsToTime(Math.max(0, activeSec));
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
    const activeSec = timeToSeconds(activeTime);
    
    // Parse the date to check for Eid period (April 10-30, 2025)
    const [year, month, day] = date.split('-').map(Number);
    
    let requiredSec;
    
    // Check if the date falls within the Eid period [cite: 107]
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        requiredSec = 6 * 3600; // 6 hours 
    } else {
        // 8 hours * 3600 + 24 minutes * 60 [cite: 105]
        requiredSec = (8 * 3600) + (24 * 60); 
    }

    return activeSec >= requiredSec; // Returns true if quota met [cite: 104]
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
    const data = fs.readFileSync(textFile, 'utf8').trim();
    const lines = data.split('\n');
    
    // 1. Check for duplicate (driverID and date) 
    for (let line of lines) {
        const columns = line.split(',');
        if (columns[0] === shiftObj.driverID && columns[2] === shiftObj.date) {
            return {}; // Return empty object for duplicates [cite: 133]
        }
    }

    // 2. Calculate the required fields 
    const duration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idle = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const active = getActiveTime(duration, idle);
    const met = metQuota(shiftObj.date, active);

    // 3. Create the new record object [cite: 134, 150]
    const newEntry = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: duration,
        idleTime: idle,
        activeTime: active,
        metQuota: met,
        hasBonus: false // Default value [cite: 137]
    };

    // 4. Determine insertion point 
    const csvRow = `${newEntry.driverID},${newEntry.driverName},${newEntry.date},${newEntry.startTime},${newEntry.endTime},${newEntry.shiftDuration},${newEntry.idleTime},${newEntry.activeTime},${newEntry.metQuota},${newEntry.hasBonus}`;
    
    let lastIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].split(',')[0] === shiftObj.driverID) {
            lastIndex = i;
        }
    }

    if (lastIndex !== -1) {
        lines.splice(lastIndex + 1, 0, csvRow); // Insert after last record of this driver [cite: 136]
    } else {
        lines.push(csvRow); // Append to the end [cite: 135]
    }

    // 5. Write back to file and return object
    fs.writeFileSync(textFile, lines.join('\n'));
    return newEntry;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
