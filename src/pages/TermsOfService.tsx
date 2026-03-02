import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => (
  <>
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Terms of Service</h1>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing the SedgePro website or using our services, you agree to be bound by these Terms of Service and all applicable laws in the Republic of South Africa.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Services Offered</h2>
            <p>Sedgepro provides construction management software. We reserve the right to modify or discontinue services at our discretion.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Conduct</h2>
            <p>Users agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the website for any unlawful purpose.</li>
              <li>Attempt to bypass website security or harvest data.</li>
              <li>Provide false or misleading information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Intellectual Property</h2>
            <p>All content on this website, including logos, text, graphics, and software, is the property of SedgePro and is protected by intellectual property laws. You may not reproduce or distribute any content without written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, SedgePro shall not be liable for any direct, indirect, or consequential damages arising from the use of our website or services. Our services are provided "as is" without any express or implied warranties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Indemnity</h2>
            <p>You agree to indemnify and hold SedgePro harmless from any claims, losses, or expenses resulting from your breach of these terms or misuse of our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. External Links</h2>
            <p>Our website may contain links to third-party sites. SedgePro is not responsible for the content or privacy practices of these external websites.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Governing Law</h2>
            <p>These terms are governed by and construed in accordance with the laws of South Africa. Any disputes will be subject to the jurisdiction of South African courts.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Amendments</h2>
            <p>We reserve the right to update these terms at any time. Continued use of the website following changes constitutes acceptance of the new terms.</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default TermsOfService;
