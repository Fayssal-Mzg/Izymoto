"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

export default function Home() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      document.getElementById("sectionIzzyMoto")?.classList.add("fade-in");
    }
  }, [inView]);

  return (
    <section className="relative w-full">
      {/* Image et CTA */}
      <div
        className="relative w-full h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/moto.jpg')" }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="text-left p-10 max-w-2xl bg-white bg-opacity-90 rounded-md shadow-lg">
            <div className="flex space-x-2 mb-4">
              <Image src="/france.png" width={24} height={16} alt="Français" />
              <Image src="/uk.png" width={24} height={16} alt="English" />
              <Image src="/spain.png" width={24} height={16} alt="Español" />
            </div>
            <h1 className="text-3xl font-bold text-black mb-6">
              Réservez votre Taxi moto en un clic.
            </h1>
            <div className="flex justify-center">
              <Link href="/reserver">
                <button className="bg-black text-white px-8 py-3 rounded-md font-medium hover:bg-[#ffc107] hover:text-black transition-colors duration-300">
                  Réserver
                </button>
              </Link>
            </div>
            <div className="flex justify-center mt-4">
              <Link href="/contact">
                <button className="bg-black text-white px-8 py-3 rounded-md font-medium hover:bg-[#ffc107] hover:text-black transition-colors duration-300">
                  Contact
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Section Pourquoi choisir IZYMOTO */}
      <section
        ref={ref}
        id="sectionIzzyMoto"
        className="bg-[#fdfbf5] text-black py-16 px-4 transition-opacity duration-1000"
      >
        <h2 className="text-center text-3xl font-bold mb-12">
          Pourquoi choisir IZYMOTO?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* 1er bloc */}
          <div className="bg-black text-white p-6 rounded-md">
            <h3 className="text-lg font-bold mb-2">
              Un service rapide et fiable
            </h3>
            <p>
              Avec <strong>IzyMoto</strong>, vous avez{" "}
              <strong>
                la garantie d’une prise en charge rapide et efficace
              </strong>
              . Votre temps est précieux, et nous veillons à optimiser{" "}
              <strong>chaque trajet</strong> pour vous emmener à destination{" "}
              <strong>sans stress ni retard</strong>.
            </p>
          </div>

          {/* 2e bloc */}
          <div className="bg-black text-white p-6 rounded-md">
            <h3 className="text-lg font-bold mb-2">
              Une solution économique et transparente
            </h3>
            <p>
              Nous proposons{" "}
              <strong>des tarifs attractifs et sans surprise</strong>. Vous
              savez exactement combien vous payez, avec une alternative{" "}
              <strong>plus rapide et abordable</strong> que de nombreux autres
              moyens de transport.
            </p>
          </div>

          {/* 3e bloc */}
          <div className="bg-black text-white p-6 rounded-md">
            <h3 className="text-lg font-bold mb-2">
              Un professionnel dédié à votre confort
            </h3>
            <p>
              Vous n’êtes pas un simple client : chaque trajet est{" "}
              <strong>une expérience sur-mesure</strong>, avec{" "}
              <strong>un conducteur expérimenté et attentionné</strong>.
              Sécurité, confort et discrétion sont au cœur de notre engagement.
            </p>
          </div>

          {/* 4e bloc */}
          <div className="bg-black text-white p-6 rounded-md">
            <h3 className="text-lg font-bold mb-2">
              Une réactivité à toute épreuve
            </h3>
            <p>
              Besoin d’un transport <strong>en urgence</strong> ? Nous nous
              adaptons rapidement à votre demande, avec une{" "}
              <strong>disponibilité immédiate</strong> et une{" "}
              <strong>flexibilité totale</strong>.
            </p>
          </div>

          {/* 5e bloc centré */}
          <div className="col-span-1 md:col-span-2 bg-black text-white p-6 rounded-md text-center">
            <h3 className="text-lg font-bold mb-2">
              Une alternative efficace aux taxis et VTC
            </h3>
            <p>
              Fini les bouchons et les temps d’attente interminables ! Avec{" "}
              <strong>IzyMoto</strong>, vous gagnez du temps grâce à un{" "}
              <strong>mode de transport rapide et fluide</strong>, idéal pour
              les professionnels et les déplacements urgents.
            </p>
          </div>
        </div>
      </section>

      {/* Section Réseaux sociaux */}
      <section className="bg-[#fdfbf5] text-black py-8 px-4">
        <h2 className="text-center text-3xl font-bold mb-4">Suivez-nous</h2>
        <div className="flex justify-center space-x-4">
          <Link href="https://www.facebook.com">
            <Image src="/facebook.png" width={32} height={32} alt="Facebook" />
          </Link>
          <Link href="https://www.twitter.com">
            <Image src="/twitter.png" width={32} height={32} alt="Twitter" />
          </Link>
          <Link href="https://www.instagram.com">
            <Image
              src="/instagram.png"
              width={32}
              height={32}
              alt="Instagram"
            />
          </Link>
          <Link href="https://www.linkedin.com">
            <Image src="/linkedin.png" width={32} height={32} alt="LinkedIn" />
          </Link>
        </div>
      </section>
    </section>
  );
}
