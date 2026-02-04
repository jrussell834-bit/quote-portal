import React, { useState } from 'react';

type ModalType = 'privacy' | 'terms' | 'cookies' | null;

export const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<ModalType>(null);

  const currentYear = new Date().getFullYear();

  const openModal = (type: ModalType) => {
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };

  return (
    <>
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur mt-auto">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => openModal('privacy')}
                className="hover:text-slate-900 transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => openModal('terms')}
                className="hover:text-slate-900 transition-colors"
              >
                Terms of Service
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => openModal('cookies')}
                className="hover:text-slate-900 transition-colors"
              >
                Cookie Policy
              </button>
            </div>
            <div className="text-slate-500">
              © {currentYear} Quote Portal. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4" onClick={closeModal}>
          <div
            className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalType === 'privacy' && 'Privacy Policy'}
                {modalType === 'terms' && 'Terms of Service'}
                {modalType === 'cookies' && 'Cookie Policy'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 text-sm text-slate-700 leading-relaxed">
              {modalType === 'privacy' && (
                <div className="space-y-4">
                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">1. Information We Collect</h3>
                    <p>
                      We collect information that you provide directly to us, including:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Account information (username, password)</li>
                      <li>Quote and customer data (organization names, contact details, project information)</li>
                      <li>File attachments you upload</li>
                      <li>Notes and comments you add to quotes</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">2. How We Use Your Information</h3>
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Provide, maintain, and improve our services</li>
                      <li>Process and manage your quotes and customer data</li>
                      <li>Send you email reminders for follow-ups</li>
                      <li>Respond to your inquiries and provide customer support</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">3. Data Security</h3>
                    <p>
                      We implement appropriate technical and organizational measures to protect your personal data
                      against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in
                      transit and stored securely in our database.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">4. Data Retention</h3>
                    <p>
                      We retain your data for as long as your account is active or as needed to provide you services.
                      You may request deletion of your account and associated data at any time.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">5. Your Rights (GDPR)</h3>
                    <p>Under GDPR, you have the right to:</p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Access your personal data</li>
                      <li>Rectify inaccurate data</li>
                      <li>Request deletion of your data</li>
                      <li>Object to processing of your data</li>
                      <li>Data portability</li>
                      <li>Withdraw consent at any time</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">6. Third-Party Services</h3>
                    <p>
                      We use third-party services for hosting and email delivery. These services are bound by their
                      own privacy policies and data protection agreements.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">7. Changes to This Policy</h3>
                    <p>
                      We may update this Privacy Policy from time to time. We will notify you of any changes by
                      posting the new policy on this page and updating the "Last Updated" date.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">8. Contact Us</h3>
                    <p>
                      If you have any questions about this Privacy Policy, please contact us through your account
                      administrator or support channels.
                    </p>
                  </section>

                  <p className="text-xs text-slate-500 mt-6">
                    Last Updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}

              {modalType === 'terms' && (
                <div className="space-y-4">
                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h3>
                    <p>
                      By accessing and using this Quote Portal application, you accept and agree to be bound by the
                      terms and provision of this agreement.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">2. Use License</h3>
                    <p>
                      Permission is granted to use this application for business purposes. This license shall
                      automatically terminate if you violate any of these restrictions.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">3. User Accounts</h3>
                    <p>
                      You are responsible for maintaining the confidentiality of your account credentials. You agree
                      to notify us immediately of any unauthorized use of your account.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">4. User Content</h3>
                    <p>
                      You retain ownership of all content you upload to the service. By uploading content, you grant
                      us a license to store, process, and display that content as necessary to provide the service.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">5. Prohibited Uses</h3>
                    <p>You may not use the service:</p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>For any unlawful purpose</li>
                      <li>To transmit any malicious code or viruses</li>
                      <li>To interfere with or disrupt the service</li>
                      <li>To attempt unauthorized access to any part of the service</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">6. Service Availability</h3>
                    <p>
                      We strive to maintain high availability but do not guarantee uninterrupted access. We reserve
                      the right to modify, suspend, or discontinue the service at any time.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">7. Limitation of Liability</h3>
                    <p>
                      The service is provided "as is" without warranties of any kind. We shall not be liable for any
                      indirect, incidental, or consequential damages arising from your use of the service.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">8. Indemnification</h3>
                    <p>
                      You agree to indemnify and hold harmless the service providers from any claims, damages, or
                      expenses arising from your use of the service or violation of these terms.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">9. Changes to Terms</h3>
                    <p>
                      We reserve the right to modify these terms at any time. Continued use of the service after
                      changes constitutes acceptance of the new terms.
                    </p>
                  </section>

                  <p className="text-xs text-slate-500 mt-6">
                    Last Updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}

              {modalType === 'cookies' && (
                <div className="space-y-4">
                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">1. What Are Cookies</h3>
                    <p>
                      Cookies are small text files that are stored on your device when you visit our website. They
                      help us provide you with a better experience by remembering your preferences and settings.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">2. How We Use Cookies</h3>
                    <p>We use cookies for the following purposes:</p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>
                        <strong>Authentication:</strong> To keep you logged in and maintain your session
                      </li>
                      <li>
                        <strong>Preferences:</strong> To remember your settings and preferences
                      </li>
                      <li>
                        <strong>Security:</strong> To protect against unauthorized access
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">3. Types of Cookies We Use</h3>
                    <p>
                      <strong>Essential Cookies:</strong> These are necessary for the website to function properly.
                      They include authentication tokens and session management.
                    </p>
                    <p className="mt-2">
                      We do not use tracking cookies, advertising cookies, or analytics cookies that collect personal
                      information for third parties.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">4. Managing Cookies</h3>
                    <p>
                      You can control cookies through your browser settings. However, disabling essential cookies may
                      affect the functionality of the service, including your ability to log in.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-slate-900 mb-2">5. Third-Party Cookies</h3>
                    <p>
                      We do not use third-party cookies for tracking or advertising purposes. Any third-party services
                      we use (such as hosting providers) may set their own cookies, which are governed by their
                      respective privacy policies.
                    </p>
                  </section>

                  <p className="text-xs text-slate-500 mt-6">
                    Last Updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
