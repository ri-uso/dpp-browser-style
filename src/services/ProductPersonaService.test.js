import { describe, expect, it } from 'vitest';
import { createProductPersonaPrompt } from './ProductPersonaService.jsx';
import pieno from '../../public/test-pieno.json';
import vuoti from '../../public/test-vuoti.json';
import productA from '../test-data/test_product_A.json';

describe('createProductPersonaPrompt', () => {
  const prompt = createProductPersonaPrompt(pieno, 'IT');

  it('passa al modello i valori numerici con unita\' e descrizione', () => {
    expect(prompt).toContain('- Emissioni CO₂: 1.8 kg CO₂/kg (Impronta carbonica stimata per kg di prodotto finito)');
    expect(prompt).toMatch(/Litri di acqua utilizzati per produrre 1 metro lineare di tessuto/);
  });

  it('raggruppa le proprieta\' sotto il nome del form', () => {
    expect(prompt).toMatch(/## Sostenibilità\n- .*\n- .*\n- Emissioni CO₂/);
    expect(prompt).toContain('## Cura e fine vita');
  });

  it('passa i testi e segnala i documenti senza leggerne l\'URL', () => {
    expect(prompt).toContain('Turchia (cotone)');
    expect(prompt).toMatch(/GOTS: documento consultabile nella pagina del prodotto/);
    expect(prompt).not.toContain('youtube.com');
    expect(prompt).not.toContain('podcasts.ceu.edu');
  });

  it('toglie dal summary gli identificativi interni', () => {
    expect(prompt).not.toContain('company_uuid');
    expect(prompt).not.toContain('company_vat');
    expect(prompt).toContain('company_shortname: Azienda Prova');
  });

  it('ricava i tratti della persona dai materiali e dalle certificazioni', () => {
    expect(prompt).not.toContain('Sei ben fatto');
  });

  it('non crea sezioni per i form senza valori', () => {
    expect(createProductPersonaPrompt(vuoti, 'IT')).not.toContain('TUTTA VUOTA');
  });

  it('include i lotti collegati della filiera', () => {
    expect(createProductPersonaPrompt(productA, 'IT')).toContain('## Filiera (lotti collegati)\n- TEST-PARTNER, ITEM-000, 100 KG');
  });

  it('in voce usa il blocco parlato', () => {
    const voice = createProductPersonaPrompt(pieno, 'IT', 'voice');
    expect(voice).toContain('FORMATO (conversazione a voce)');
    expect(voice).not.toContain('FORMATO (chat scritta)');
  });
});
