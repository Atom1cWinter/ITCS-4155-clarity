interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicy({ isOpen, onClose }: PrivacyPolicyProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-surface p-8 rounded-2xl max-w-2xl w-full my-8">
        <h2 className="text-3xl font-semibold text-primary text-center mb-6">Privacy Policy</h2>

        <div className="space-y-6 max-h-96 overflow-y-auto pr-4 text-center">
          {/* Introduction */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Introduction</h3>
            <p className="text-muted text-sm">
              Clarity ("we," "us," "our," or "Company") operates the Clarity website and application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data. This is a school project developed for educational purposes.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Information We Collect</h3>
            <p className="text-muted text-sm mb-3">We collect several types of information for various purposes:</p>
            <ul className="text-muted text-sm space-y-2 ml-4 inline-block">
              <li><strong className="text-primary">Account Information:</strong> When you create an account, we collect your email address and password.</li>
              <li><strong className="text-primary">Profile Data:</strong> Display name, avatar, and other profile information you voluntarily provide.</li>
              <li><strong className="text-primary">Learning Data:</strong> Summaries, documents, flashcards, and quizzes you create while using our service.</li>
              <li><strong className="text-primary">Usage Information:</strong> Information about how you interact with our service, including timestamps and file metadata.</li>
            </ul>
          </section>

          {/* Use of Data */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Use of Your Data</h3>
            <p className="text-muted text-sm">Clarity uses the collected data for various purposes:</p>
            <ul className="text-muted text-sm space-y-2 ml-4 mt-2 inline-block">
              <li>• To provide and maintain our service</li>
              <li>• To notify you about changes to our service</li>
              <li>• To allow you to participate in interactive features of our service</li>
              <li>• To provide customer support</li>
              <li>• To gather analysis or valuable information so we can improve our service</li>
              <li>• To monitor the usage of our service</li>
              <li>• To detect, prevent and address technical issues</li>
            </ul>
          </section>

          {/* Data Storage */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Data Storage and Security</h3>
            <p className="text-muted text-sm">
              Your data is stored securely using Firebase, a cloud-based backend service provided by Google. We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet or method of electronic storage is 100% secure.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Third-Party Services</h3>
            <p className="text-muted text-sm mb-3">Our service uses the following third-party services:</p>
            <ul className="text-muted text-sm space-y-2 ml-4 inline-block">
              <li><strong className="text-primary">Firebase:</strong> For authentication, data storage, and backend services</li>
              <li><strong className="text-primary">OpenAI GPT:</strong> For generating summaries and AI-powered features</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Data Retention</h3>
            <p className="text-muted text-sm">
              Clarity will retain your personal data only for as long as necessary for the purposes set out in this Privacy Policy. Your personal data will be retained for the duration of your account or until you request deletion. You may request complete deletion of your account and associated data at any time through your profile settings.
            </p>
          </section>

          {/* User Rights */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Your Rights</h3>
            <p className="text-muted text-sm mb-3">You have the following rights regarding your data:</p>
            <ul className="text-muted text-sm space-y-2 ml-4 inline-block">
              <li>• The right to access your personal data</li>
              <li>• The right to correct inaccurate data</li>
              <li>• The right to request deletion of your data</li>
              <li>• The right to withdraw consent at any time</li>
            </ul>
          </section>

          {/* Changes to Policy */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Changes to This Privacy Policy</h3>
            <p className="text-muted text-sm">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date below.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Contact Us</h3>
            <p className="text-muted text-sm">
              If you have any questions about this Privacy Policy, please contact us through the "Send Feedback" option in the application.
            </p>
          </section>

          {/* Footer */}
          <section className="pt-4 border-t border-white/10">
            <p className="text-text-subtle text-xs">
              <strong>Last Updated:</strong> October 2025
            </p>
            <p className="text-text-subtle text-xs mt-1">
              This is a privacy policy for an educational school project. Not intended for commercial use.
            </p>
          </section>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
