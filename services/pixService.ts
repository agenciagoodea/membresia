import QRCode from 'qrcode';

/**
 * Serviço para geração de QR Code Pix estático (padrão EMV/BRCode).
 * Gera payload compatível com qualquer app bancário brasileiro.
 */

// CRC16-CCITT (padrão EMV)
function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com padrão EMV.
 */
function sanitize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 @.]/g, '')
    .substring(0, 25);
}

export const pixService = {
  /**
   * Gera o payload BRCode para Pix estático.
   * @param pixKey - Chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)
   * @param receiverName - Nome do recebedor (max 25 chars, sem acentos)
   * @param city - Cidade do recebedor (max 15 chars, sem acentos)
   * @param amount - Valor em reais (ex: 250.00)
   * @param txId - Identificador da transação (opcional, max 25 chars)
   */
  generatePayload(
    pixKey: string,
    receiverName: string,
    city: string,
    amount: number,
    txId: string = '***'
  ): string {
    const sanitizedName = sanitize(receiverName);
    const sanitizedCity = sanitize(city).substring(0, 15);

    // Merchant Account Information (ID 26)
    const gui = tlv('00', 'br.gov.bcb.pix');
    const key = tlv('01', pixKey);
    const merchantAccountInfo = tlv('26', gui + key);

    // Montando o payload
    let payload = '';
    payload += tlv('00', '01'); // Payload Format Indicator
    payload += merchantAccountInfo; // Merchant Account Information
    payload += tlv('52', '0000'); // Merchant Category Code
    payload += tlv('53', '986'); // Transaction Currency (BRL)

    if (amount > 0) {
      payload += tlv('54', amount.toFixed(2)); // Transaction Amount
    }

    payload += tlv('58', 'BR'); // Country Code
    payload += tlv('59', sanitizedName); // Merchant Name
    payload += tlv('60', sanitizedCity); // Merchant City
    payload += tlv('62', tlv('05', txId)); // Additional Data Field Template (txId)

    // CRC16 — o campo 63 é calculado sobre todo o payload + "6304"
    payload += '6304';
    const checksum = crc16(payload);
    payload += checksum;

    return payload;
  },

  /**
   * Gera uma imagem QR Code em formato Data URL (base64) a partir do payload.
   */
  async generateQRCodeDataURL(payload: string): Promise<string> {
    try {
      return await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Falha ao gerar QR Code Pix');
    }
  },

  /**
   * Gera payload + QR Code de uma vez.
   */
  async generatePixQRCode(
    pixKey: string,
    receiverName: string,
    city: string,
    amount: number,
    txId?: string
  ): Promise<{ payload: string; qrCodeDataURL: string }> {
    const payload = this.generatePayload(pixKey, receiverName, city, amount, txId);
    const qrCodeDataURL = await this.generateQRCodeDataURL(payload);
    return { payload, qrCodeDataURL };
  }
};
