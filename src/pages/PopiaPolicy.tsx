import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PopiaPolicy = () => (
  <>
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">POPIA Policy</h1>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>Sedgepro ("we," "us," or "our") is committed to protecting the privacy and personal information of our clients, website visitors, and partners. This policy outlines our practices regarding the collection and processing of personal information in accordance with the Protection of Personal Information Act (POPIA).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <p>We may collect and process the following information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identity Information:</strong> Name, surname, ID number/Company registration.</li>
              <li><strong>Contact Information:</strong> Email address, phone number, physical address.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, and usage data via cookies.</li>
              <li><strong>Service Data:</strong> Information provided by you to enable us to provide our specific services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Purpose of Processing</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and manage our services.</li>
              <li>Communicate with you regarding queries, quotes, or updates.</li>
              <li>Comply with legal and regulatory obligations.</li>
              <li>Improve our website and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Disclosure of Information</h2>
            <p>We do not sell your data. We only share information with third parties if:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>It is necessary to fulfill our service to you (e.g., subcontractors or logistics).</li>
              <li>We are required to do so by law.</li>
              <li>You have provided explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
            <p>We implement industry-standard security measures to prevent unauthorized access, loss, or damage to personal information. This includes encrypted communication and secure data storage.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>Under POPIA, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal information we hold about you.</li>
              <li>Request the correction or deletion of your information.</li>
              <li>Object to the processing of your data for marketing purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Contact Details</h2>
            <p>For any privacy-related queries, please contact our Information Officer at:</p>
            <p><strong>Email:</strong>{" "}
              <a href="mailto:info@sedgepro.co.za" className="text-accent hover:underline">info@sedgepro.co.za</a>
            </p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default PopiaPolicy;
