import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../../config/env.schema.js";
import { CryptoService } from "./crypto.services.js";

const fakeConfig = {
	getOrThrow: (name: string) => (name === "ENCRYPTION_KEY" ? "a".repeat(64) : "p".repeat(32)),
} as unknown as ConfigService<Env, true>;

describe("CryptoService", () => {
	let service: CryptoService;

	beforeEach(() => {
		service = new CryptoService(fakeConfig);
	});

	it("retrouve le texte d'origine après chiffrement puis déchiffrement", () => {
		const encrypted = service.encrypt("CI123456");
		expect(service.decrypt(encrypted)).toBe("CI123456");
	});

	it("donne deux résultats différents pour le même texte", () => {
		expect(service.encrypt("CI123456")).not.toBe(service.encrypt("CI123456"));
	});

	it("produit un format v1 en 4 morceaux", () => {
		const parts = service.encrypt("CI123456").split(":");
		expect(parts).toHaveLength(4);
		expect(parts[0]).toBe("v1");
	});

	it("refuse une donnée modifiée", () => {
		const [version, iv, tag] = service.encrypt("CI123456").split(":");
		const [, , , otherData] = service.encrypt("CI654321").split(":");
		const tampered = [version, iv, tag, otherData].join(":");
		expect(() => service.decrypt(tampered)).toThrow();
	});

	it("refuse un format invalide", () => {
		expect(() => service.decrypt("abc")).toThrow();
	});


    it("donne la même empreinte pour le même texte", () => {
        expect(service.hash("CI123456", "identity")).toBe(service.hash("CI123456", "identity"));
    });

    it("ignore la casse, les espaces et les tirets", () => {
        expect(service.hash("CI 123-456", "identity")).toBe(service.hash("ci123456", "identity"));
    });

    it("donne deux empreintes différentes selon l'usage", () => {
        expect(service.hash("CI123456", "identity")).not.toBe(service.hash("CI123456", "payout"));
    });

    it("produit une empreinte de 64 caractères", () => {
        expect(service.hash("CI123456", "identity")).toHaveLength(64);
    });

    it("refuse un texte vide", () => {
        expect(() => service.hash("   ", "identity")).toThrow();
    });
});