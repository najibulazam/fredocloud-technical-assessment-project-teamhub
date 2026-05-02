import emailjs from "@emailjs/nodejs";

const serviceId = process.env.EMAILJS_SERVICE_ID;
const inviteTemplateId = process.env.EMAILJS_TEMPLATE_ID_INVITE;
const mentionTemplateId = process.env.EMAILJS_TEMPLATE_ID_MENTION;
const publicKey = process.env.EMAILJS_PUBLIC_KEY;
const privateKey = process.env.EMAILJS_PRIVATE_KEY;

const buildButton = (label, url) => {
  return `
    <a href="${url}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
      ${label}
    </a>
  `;
};

const wrapEmail = (title, body) => {
  return `
    <div style="font-family:Arial, sans-serif; background:#f6f7fb; padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;">
        <h2 style="margin:0 0 12px 0;color:#111827;">${title}</h2>
        <div style="color:#374151;font-size:15px;line-height:1.6;">${body}</div>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Team Hub</p>
      </div>
    </div>
  `;
};

const sendTemplate = async (templateId, params, label) => {
  if (!serviceId || !templateId || !publicKey) {
    console.warn("EmailJS is not configured. Skipping email send.");
    return;
  }

  try {
    await emailjs.send(serviceId, templateId, params, {
      publicKey,
      privateKey
    });
    console.log(`${label} email sent to ${params.to_email}`);
  } catch (error) {
    console.error(`Failed to send ${label} email`, error);
  }
};

export async function sendInvitationEmail({ to, inviterName, workspaceName, acceptUrl }) {
  const subject = `You've been invited to join ${workspaceName} on Team Hub`;
  const body = `
    <p><strong>${inviterName}</strong> invited you to join the workspace <strong>${workspaceName}</strong>.</p>
    <div style="margin:20px 0;">${buildButton("Accept Invitation", acceptUrl)}</div>
    <p>If you were not expecting this invite, you can ignore this email.</p>
  `;

  await sendTemplate(
    inviteTemplateId,
    {
      to_email: to,
      subject,
      html: wrapEmail(subject, body),
      inviter_name: inviterName,
      workspace_name: workspaceName,
      accept_url: acceptUrl
    },
    "invitation"
  );
}

export async function sendMentionEmail({
  to,
  mentionerName,
  workspaceName,
  commentPreview,
  commentUrl
}) {
  const subject = `${mentionerName} mentioned you in ${workspaceName}`;
  const body = `
    <p><strong>${mentionerName}</strong> mentioned you in <strong>${workspaceName}</strong>.</p>
    <blockquote style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-left:4px solid #4f46e5;">
      ${commentPreview}
    </blockquote>
    <div style="margin:20px 0;">${buildButton("View Comment", commentUrl)}</div>
  `;

  await sendTemplate(
    mentionTemplateId,
    {
      to_email: to,
      subject,
      html: wrapEmail(subject, body),
      mentioner_name: mentionerName,
      workspace_name: workspaceName,
      comment_preview: commentPreview,
      comment_url: commentUrl
    },
    "mention"
  );
}
