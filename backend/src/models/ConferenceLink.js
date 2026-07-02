import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const { Schema } = mongoose;

const ConferenceLinkSchema = new Schema(
  {
    linkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => nanoid(8),
    },
    creatorName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'used'],
      default: 'active',
      required: true,
    },
    maxParticipants: {
      type: Number,
      default: 20,
      required: true,
    },
    roomConfig: {
      emptyTimeout: {
        type: Number,
        default: 600,
        required: true,
      },
      enableRecording: {
        type: Boolean,
        default: false,
        required: true,
      },
      enableChat: {
        type: Boolean,
        default: true,
        required: true,
      },
    },
    currentRoom: {
      roomName: {
        type: String,
        default: null,
      },
      isActive: {
        type: Boolean,
        default: false,
        required: true,
      },
      participantCount: {
        type: Number,
        default: 0,
        required: true,
      },
      startedAt: {
        type: Date,
        default: null,
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Pre-save hook to update lastAccessedAt automatically on update/save
ConferenceLinkSchema.pre('save', function () {
  this.lastAccessedAt = new Date();
});

const ConferenceLink = mongoose.model('ConferenceLink', ConferenceLinkSchema);

export default ConferenceLink;
