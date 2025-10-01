import config from "../config";
import { sendEmail } from "./mailSender";

interface BookingNotificationEmailParams {
  sentTo: string;       // user email
  subject: string;      // email subject
  userName: string;     // sender name (service provider)
  messageText: string;  // main text
}

interface OtpSendEmailParams {
  sentTo: string;
  subject: string;
  name: string;
  otp: string | number;
  expiredAt: string;
}


interface WelcomeEmailParams {
  sentTo: string;
  subject: string;
  name: string;
  role: 'employer' | 'Candidate';
}


interface EmployerSubscriptionActivatedEmailParams {
  sentTo: string;
  subject: string;
  companyName: string;
  packageType: 'Platinum' | 'Diamond';
}

const logoUrl = 'http://10.10.10.32:9010/uploads/logo/StaffSecure_Logo.png'; // Use your actual domain
  const primaryColor = '#0C3188';
    const supportEmail = 'frankedwards@staffsecure.ai';


const otpSendEmail = async ({
  sentTo,
  subject,
  name,
  otp,
  expiredAt,
}: OtpSendEmailParams): Promise<void> => {

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img 
          src="${config.logo_url}" 
          alt="Staff Secure Logo" 
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" 
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          One-Time Password (OTP)
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Use the following One-Time Password (OTP) to complete your verification.
          This code is valid for a limited time.
        </p>

        <div style="
          background-color: #f4f6fb;
          border: 1px dashed ${primaryColor};
          padding: 20px;
          text-align: center;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <p style="margin: 0; font-size: 14px; color: #555;">Your OTP Code</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: ${primaryColor}; letter-spacing: 4px;">
            ${otp}
          </p>
        </div>

        <p style="font-size: 14px; color: #666;">
          This OTP will expire on:<br />
          <strong>${expiredAt.toLocaleString()}</strong>
        </p>

        <p style="margin-top: 24px; font-size: 14px;">
          If you didn’t request this code or need assistance, please contact our
          support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Staff Secure Team</strong><br />
          Staff Secure Ltd
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Staff Secure Ltd. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, subject, emailBody);
};

 const sendBookingNotificationEmail = async ({
  sentTo,
  subject,
  userName,
  messageText,
}: BookingNotificationEmailParams): Promise<void> => {
  await sendEmail(
    sentTo,
    subject,
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
       <h1>Hello ${userName},</h1>
       <p style="font-size: 16px;">${messageText}</p>
       <p style="font-size: 14px; color: #666;">Thank you for using our platform!</p>
    </div>`
  );
};

const sendWelcomeEmail = async ({
  sentTo,
  subject,
  name,
  role,
}: WelcomeEmailParams): Promise<void> => {


  const emailBody =
    role === 'employer'
      ? `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    
    <!-- Header with Logo -->
    <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
      <img src="${config.logo_url}" alt="Staff Secure Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 16px;" />
      <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to Staff Secure</h1>
    </div>

    <!-- Body -->
    <div style="padding: 24px; color: #333333;">
      <p>Hello <strong>${name}</strong>,</p>

      <p>Your employer account has been successfully created. You can now manage your vacancies, review candidates, and access premium recruitment features.</p>

      <p>To get started, please sign in to your dashboard and select the right package for your business to begin posting vacancies.</p>

      <a href="https://staffsecure.ai" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 16px 0;">Visit Staff Secure</a>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

      <p>If you need assistance, our team is available via <strong>Live Chat</strong> inside your dashboard.</p>

      <p style="margin-top: 32px;">Kind regards,<br /><strong>Staff Secure Team</strong><br />Staff Secure Ltd</p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f5; text-align: center; padding: 16px; font-size: 12px; color: #666666;">
      &copy; ${new Date().getFullYear()} Staff Secure Ltd. All rights reserved.
    </div>
  </div>
      `
      : `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    
    <!-- Header with Logo -->
    <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
      <img src="${config.logo_url}" alt="Staff Secure Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 16px;" />
      <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Your Candidate Profile is Ready</h1>
    </div>

    <!-- Body -->
    <div style="padding: 24px; color: #333333;">
      <p>Hello <strong>${name}</strong>,</p>

      <p>Welcome to Staff Secure! Your candidate profile has been successfully created.</p>

      <p>You can now:</p>
      <ul>
        <li>Browse current vacancies</li>
        <li>Apply for roles that match your skills</li>
        <li>Upload your CV and supporting documents</li>
        <li>Track your applications from your dashboard</li>
      </ul>

      <p>To improve your chances of being selected, we recommend completing your profile and uploading any relevant certifications or documents.</p>

      <a href="https://staffsecure.ai" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 16px 0;">Visit Staff Secure</a>

      <p style="margin-top: 32px;">If you need help at any time, our support team is available via <strong>Live Chat</strong>.</p>

      <p style="margin-top: 32px;">Kind regards,<br /><strong>Staff Secure Team</strong><br />Staff Secure Ltd</p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f5; text-align: center; padding: 16px; font-size: 12px; color: #666666;">
      &copy; ${new Date().getFullYear()} Staff Secure Ltd. All rights reserved.
    </div>
  </div>
      `;

  await sendEmail(sentTo, subject, emailBody);
};

const sendEmployerSubscriptionActivatedEmail = async ({
  sentTo,
  subject,
  companyName,
  packageType,
}: EmployerSubscriptionActivatedEmailParams): Promise<void> => {


  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${config.logo_url}"
          alt="Staff Secure Logo"
          style="max-width: 160px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Subscription Activated
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${companyName}</strong>,</p>

        <p>
          Thank you for choosing <strong>Staff Secure</strong> and purchasing the
          <strong>${packageType}</strong> package.
        </p>

        <div style="
          background-color: #f4f6fb;
          border-left: 4px solid ${primaryColor};
          padding: 16px;
          border-radius: 4px;
          margin: 20px 0;
        ">
          <p style="margin: 0;">
            ✅ Your <strong>${packageType}</strong> package is now
            <strong style="color:${primaryColor};">active</strong>.
          </p>
        </div>

        <p>
          You can now begin posting vacancies, managing candidates, and accessing
          premium recruitment features through your employer dashboard.
        </p>

        <hr style="margin: 28px 0;" />

        <h3 style="color: ${primaryColor}; margin-bottom: 8px;">
          Payroll services (optional)
        </h3>

        <p>
          If you require payroll services for a candidate or employee hired through
          Staff Secure, please contact our trusted payroll partner:
        </p>

         <p>
          <a
            href="https://sg-umbrella.co.uk/"
            target="_blank"
            style="color:${primaryColor}; font-weight: bold; text-decoration: none;"
          >
            SG Umbrella
          </a>
          <br />
          Contact:
          <span style="color:${primaryColor}; font-weight: bold;">
            Alex Powell
          </span>
        </p>
        
        <p>
          Quote the reference below to receive the agreed discounted rate:
        </p>

        <p style="
          background-color: #f4f6fb;
          padding: 12px;
          border-radius: 4px;
          display: inline-block;
          font-weight: bold;
        ">
          Reference: Staff Secure X121
        </p>

        <ul style="font-size: 14px; color: #555; margin-top: 16px;">
          <li>Payroll services are optional</li>
          <li>Staff Secure does not process payroll directly</li>
          <li>SG Umbrella operates independently</li>
        </ul>

        <p style="margin-top: 24px; font-size: 14px;">
          Need help? Contact us at
          <a href="mailto:${supportEmail}" style="color:${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>
          or via <strong>Live Chat</strong> in your dashboard.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Staff Secure Team</strong><br />
          Staff Secure Ltd
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Staff Secure Ltd. All rights reserved.
      </div>
    </div>
  `;

  // 🔥 Non-blocking send (do not await if you want async fire-and-forget)
  void sendEmail(sentTo, subject, emailBody);
};

interface JobApplicationSuccessEmailParams {
  sentTo: string;
  candidateName: string;
  jobTitle: string;
}

const sendJobApplicationSuccessEmail = async ({
  sentTo,
  candidateName,
  jobTitle,
}: JobApplicationSuccessEmailParams): Promise<void> => {

  const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
      <img src="${config.logo_url}" alt="Staff Secure Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 16px;" />
      <h1 style="color: #ffffff; font-size: 24px; margin: 0;">
        Application Submitted Successfully
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 24px; color: #333333;">
      <p>Hello <strong>${candidateName}</strong>,</p>

      <p>
        Thank you for applying for the position of
        <strong>${jobTitle}</strong>. Your application has been successfully received.
      </p>

      <p><strong>What happens next?</strong></p>
      <ul>
        <li>Your application and CV will first be reviewed by the Staff Secure admin team</li>
        <li>If your profile matches the job requirements, your details will be shared with the employer</li>
        <li>If the employer selects your profile, you will receive an email notification from us</li>
      </ul>

      <p>
        Please note that only shortlisted candidates will be contacted.
      </p>

      <p>
        If you need any assistance, our support team is available via
        <strong>Live Chat</strong> or you can email us at
        <a href="mailto:frankedwards@staffsecure.ai">frankedwards@staffsecure.ai</a>.
      </p>

      <p style="margin-top: 32px;">
        Kind regards,<br />
        <strong>Staff Secure Team</strong><br />
        Staff Secure Ltd
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f5; text-align: center; padding: 16px; font-size: 12px; color: #666666;">
      &copy; ${new Date().getFullYear()} Staff Secure Ltd. All rights reserved.
    </div>
  </div>
  `;

  await sendEmail(
    sentTo,
    'Your job application has been received',
    emailBody
  );
};

// const sendEmployerSubscriptionActivatedEmail = async ({
//   sentTo,
//   subject,
//   companyName,
//   packageType,
// }: EmployerSubscriptionActivatedEmailParams): Promise<void> => {
//   await sendEmail(
//     sentTo,
//     subject,
//     `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//       <h2>Your Staff Secure ${packageType} package is now active</h2>

//       <p>Hello <strong>${companyName}</strong>,</p>

//       <p>
//         Thank you for choosing Staff Secure and for purchasing a
//         <strong>${packageType}</strong> package.
//       </p>

//       <p>
//         Your package is now active, and you can begin posting vacancies,
//         managing candidates, and accessing premium recruitment features
//         through your employer dashboard.
//       </p>

//       <hr style="margin: 24px 0;" />

//       <h3>Payroll services (optional)</h3>

//       <p>
//         If you require payroll services for a candidate or employee hired
//         through Staff Secure, you may contact our payroll partner:
//       </p>

//       <p>
//         <strong>SG Umbrella</strong><br />
//         Contact: Alex Powell
//       </p>

//       <p>
//         When contacting SG Umbrella, please quote the reference below to
//         receive the agreed discounted rate for payroll services:
//       </p>

//       <p>
//         <strong>Reference: Staff Secure X121</strong>
//       </p>

//       <p style="font-size: 14px; color: #555;">
//         Please note:
//         <ul>
//           <li>Payroll services are optional</li>
//           <li>Staff Secure does not process payroll directly</li>
//           <li>SG Umbrella will handle payroll independently</li>
//         </ul>
//       </p>

//       <p>
//         If you have any questions or require assistance, our team is
//         available via <strong>Live Chat</strong> inside your dashboard.
//       </p>

//       <p>
//         Kind regards,<br />
//         <strong>Staff Secure Team</strong><br />
//         Staff Secure Ltd
//       </p>
//     </div>`
//   );
// };




export { otpSendEmail, sendBookingNotificationEmail, sendWelcomeEmail, sendEmployerSubscriptionActivatedEmail, sendJobApplicationSuccessEmail };
