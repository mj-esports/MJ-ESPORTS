/**
 * MJ ESPORTS Production Email Template Foundations
 * HTML email definitions for Welcome, Registration Confirmation, Approval, Verification, and Announcements.
 */

export function getWelcomeEmailHTML(username) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0b0e11; color: #ffffff; padding: 30px; border-radius: 10px;">
      <h1 style="color: #00f2ff; margin-bottom: 5px;">WELCOME TO MJ ESPORTS ARENA</h1>
      <p style="color: #8e9dae; font-size: 14px;">Greetings Commander <strong>${username}</strong>,</p>
      <p style="font-size: 13px; line-height: 1.6;">Your player account is active! You can now join Free Fire and BGMI competitions, create squads, and compete for prize pools.</p>
      <div style="margin-top: 20px;">
        <a href="https://mjesports.gg/tournaments" style="background-color: #00f2ff; color: #00363a; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Browse Tournaments</a>
      </div>
    </div>
  `
}

export function getRegistrationConfirmationEmailHTML({ username, teamName, tournamentTitle, slotNumber }) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0b0e11; color: #ffffff; padding: 30px; border-radius: 10px;">
      <h2 style="color: #00ff9d;">REGISTRATION CONFIRMED</h2>
      <p style="color: #8e9dae; font-size: 14px;">Player: <strong>${username}</strong> | Squad: <strong>${teamName}</strong></p>
      <p style="font-size: 13px;">Your registration for <strong>${tournamentTitle}</strong> (Slot #${slotNumber}) has been approved.</p>
      <p style="color: #fe6b00; font-size: 12px; font-weight: bold;">Custom match room credentials will be dispatched to your dashboard prior to match start.</p>
    </div>
  `
}

export function getResultAnnouncementEmailHTML({ tournamentTitle, winnerTeam, placement = '1st Place Champion' }) {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0b0e11; color: #ffffff; padding: 30px; border-radius: 10px;">
      <h2 style="color: #fe6b00;">OFFICIAL MATCH RESULTS PUBLISHED</h2>
      <p style="font-size: 14px;">The official results for <strong>${tournamentTitle}</strong> are locked!</p>
      <p style="color: #00ff9d; font-size: 16px; font-weight: bold;">Result (${placement}): ${winnerTeam}</p>
      <p style="font-size: 12px; color: #8e9dae;">Log into MJ ESPORTS to view full leaderboard points and prize distributions.</p>
    </div>
  `
}
