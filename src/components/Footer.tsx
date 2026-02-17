import { Linkedin, Facebook, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-10 mb-10">
        {/* Brand */}
        <div>
          <img src={logo} alt="SEDGE Pro" className="h-20 mb-4" />
          <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
            Helping construction businesses build profitable and scalable operations with software + expert support.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-semibold mb-4 text-accent">Quick Links</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            {["Home", "About", "How It Works", "Pricing", "Contact"].map((l) => (
              <li key={l}>
                <a
                  href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                  className="hover:text-accent transition-colors"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal & Social */}
        <div>
          <h4 className="font-semibold mb-4 text-accent">Legal</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70 mb-6">
            <li>
              <a href="#" className="hover:text-accent transition-colors">
                POPIA Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-accent transition-colors">
                Terms of Service
              </a>
            </li>
          </ul>

          <h4 className="font-semibold mb-3 text-accent">Follow Us</h4>
          <div className="flex gap-3">
            {[
              { icon: Linkedin, label: "LinkedIn" },
              { icon: Facebook, label: "Facebook" },
              { icon: MessageCircle, label: "WhatsApp" },
            ].map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/50">
        © 2026 SEDGE Pro. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
