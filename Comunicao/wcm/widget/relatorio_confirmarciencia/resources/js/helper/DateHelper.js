class DateHelper {
  constructor(dateString) {
    if (dateString && (typeof dateString === "string")) {
      this.date = new Date(dateString);
    } else if (dateString instanceof Date) {
      this.date = dateString;
    }
    else {
      this.date = new Date();
    }
  }

  dateAdd(value, type = 'day') {
    
    switch (type) {
      case 'day':
        this.date.setDate(this.date.getDate() + value);
        break;
      case 'week':
        this.date.setDate(this.date.getDate() + value * 7);
        break;
      case 'month':
        this.date.setMonth(this.date.getMonth() + value);
        break;
      case 'year':
        this.date.setFullYear(this.date.getFullYear() + value);
        break;
      case 'hour':
        this.date.setHours(this.date.getHours() + value);
        break;
      case 'minute':
        this.date.setMinutes(this.date.getMinutes() + value);
        break;
      case 'second':
        this.date.setSeconds(this.date.getSeconds() + value);
        break;
    }
    return this;
  }

  getDBDate() {
    return DateHelper.formatDbDate(this.date);
  }

  static formatDateTime(dateString) {
    const date = new Date(dateString);
    const day = DateHelper.formatDate(date)
    const hour = DateHelper.formatTime(date)
    return `${day} ${hour}`;
  }

  static formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    return date.toLocaleDateString('pt-BR', options);
  }

  static formatTime(dateString) {
    const date = new Date(dateString);
    const options = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    };
    return date.toLocaleTimeString('pt-BR', options);
  }

  static formatHumanDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // less than 1 minute
      return `${Math.floor(diff / 1000)} segundos atrás`;
    } else if (diff < 3600000) { // less than 1 hour
      return `${Math.floor(diff / 60000)} minutos atrás`;
    } else if (diff < 86400000) { // less than 1 day
      return `${Math.floor(diff / 3600000)} horas atrás`;
    } else if (diff < 2592000000) { // less than 1 month
      return `${Math.floor(diff / 86400000)} dias atrás`;
    } else if (diff < 31536000000) { // less than 1 year
      return `${Math.floor(diff / 2592000000)} meses atrás`;
    } else {
      return `${Math.floor(diff / 31536000000)} anos atrás`;
    }
  }

  static formatDbDate(dateString) {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return date.toLocaleDateString("sv-SE", options);
  }
}