# Capsulib

A Free and Open Source Software (FOSS) solution for managing your capsule wardrobe across platforms.

## Features

- Cross-platform accessibility (Web, Desktop, Mobile)
- Data import/export functionality (Excel, CSV)
- **Peer-to-Peer Synchronization**
  - Timestamp-based conflict resolution
  - Direct device synchronization
  - No centralized server required
- Future integration with second-hand platforms (Vinted, eBay, Marktplaats)
- Privacy-focused design
- User-friendly interface for wardrobe management

## Development Status

🚧 This project is currently in early development.

## Synchronization Strategy

### Core Sync Principles
- **Peer-to-Peer Architecture**
  - Direct device communication
  - No mandatory central server
  - Secure, decentralized data sharing

### Sync Mechanism
- Periodic synchronization (configurable interval)
- Timestamp-based conflict resolution
- Supports offline mode with change queuing
- Cross-platform compatibility (Linux, Windows, Web, Android)

#### Sync Workflow
1. **Device Identification**
   - Unique device ID generation
   - Optional manual peer configuration

2. **Conflict Resolution**
   - Last-write-wins strategy
   - Minimal data transfer
   - Preserves most recent changes

### Technologies
- **Database**: CouchDB
- **Local Storage**: SQLAlchemy
- **Peer Discovery**: WebRTC/PeerJS
- **Sync Protocol**: JSON-based incremental changes

## Prerequisites

- Node.js (version TBD)
- Python (version TBD)
- CouchDB
- Additional requirements will be listed as development progresses

## Project Structure

```
capsulib/
├── .github/            # GitHub specific files (workflows, templates)
├── backend/           # Python backend service
│   ├── api/          # API endpoints
│   ├── models/       # Data models
│   ├── sync/         # Synchronization logic
│   └── tests/        # Backend tests
├── frontend/         # Web frontend
│   ├── src/         # Source files
│   ├── public/      # Static assets
│   └── tests/       # Frontend tests
├── desktop/         # Desktop app specific code
├── mobile/         # Mobile app specific code
├── docs/           # Documentation
└── scripts/        # Development and deployment scripts
```

## Getting Started

Instructions for setting up the development environment will be added as the project progresses.

## Contributing

We welcome contributions! Please read our contributing guidelines (coming soon) before submitting pull requests.

## License

[GNU GPL v3](LICENSE) - See LICENSE file for details.

## Roadmap

1. Phase 1: Core Functionality
   - Basic wardrobe management
   - Data import/export
   - Web interface
   - Initial sync mechanism

2. Phase 2: Cross-Platform
   - Desktop application
   - Mobile applications
   - Robust peer-to-peer synchronization
   - Enhanced device compatibility

3. Phase 3: Integrations
   - Vinted API integration
   - Additional marketplace integrations
   - Enhanced data analytics
   - Advanced sync features

## Technical Details

### Synchronization Architecture
- Decentralized, peer-to-peer model
- Minimal infrastructure requirements
- Privacy-preserving design
- Flexible device management

### Future Enhancements
- Manual conflict resolution
- Advanced merge strategies
- Enhanced peer discovery
- Multi-device support
